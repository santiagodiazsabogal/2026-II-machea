#![no_std]
use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, panic_with_error, token,
    Address, Env,
};

// Un ledger dura unos 5 segundos: 17 280 ledgers son un día.
const DIA_EN_LEDGERS: u32 = 17_280;

/// Un activo de Stellar tiene 7 decimales: 1 fracción = 1,0000000 del activo.
const UNIDAD: i128 = 10_000_000;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    /// (Ya no se usa: el contrato se configura en el despliegue.)
    AlreadyInitialized = 1,
    /// El contrato todavía no está configurado.
    NoInicializado = 2,
    /// El precio, el total de fracciones, el mínimo y los plazos deben ser válidos.
    ParametroInvalido = 3,
    /// Debes indicar al menos una fracción.
    FraccionesInvalidas = 4,
    /// No quedan tantas fracciones disponibles.
    NoHayFracciones = 5,
    /// La ronda ya no recibe inversiones.
    RondaCerrada = 6,
    /// La ronda todavía no alcanza su meta.
    RondaNoExitosa = 7,
    /// Los fondos ya fueron liberados.
    YaLiberada = 8,
    /// La ronda no ha fallado: no hay reembolso.
    RondaNoFallida = 9,
    /// No tienes tantas fracciones.
    SaldoInsuficiente = 10,
    /// Todavía no hay inversiones: no hay nada que cerrar.
    SinInversiones = 11,
    /// Para cerrar antes de tiempo hay que llegar al mínimo de fracciones pactado.
    MinimoNoAlcanzado = 12,
    /// Hay más fracciones que las que vendió el contrato: algo no cuadra.
    Descuadre = 13,
    /// Pasó el plazo para liberar: la ronda volvió a ser reembolsable.
    PlazoLiberacionVencido = 14,
    /// Los fondos todavía no se han liberado a la constructora.
    RondaNoLiberada = 15,
    /// Todavía no hay dinero depositado para reclamar.
    SinGanancias = 16,
}

#[contracttype]
#[derive(Clone)]
pub enum Clave {
    Config,
    Estado,
    Vendidas,
    /// Momento en que la ronda quedó exitosa (para el plazo de liberación).
    FechaExito,
    /// Dinero depositado por la fiduciaria que los tenedores todavía no reclaman.
    Bolsa,
    /// Fracciones que ya se liquidaron (se destruyeron al reclamar).
    Liquidadas,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Config {
    /// Quien autoriza la liberación de los fondos (en la vida real, una fiduciaria).
    pub fiduciaria: Address,
    /// Quien recibe el dinero si la ronda es exitosa.
    pub constructora: Address,
    /// Activo con el que se paga (XLM).
    pub token_pago: Address,
    /// Activo de Stellar de las fracciones. Este contrato debe ser su administrador.
    pub token_participacion: Address,
    /// Precio de cada fracción, en la unidad mínima del token de pago.
    pub precio_fraccion: i128,
    pub total_fracciones: u32,
    /// Momento (segundos) en que se acaba el plazo de la ronda.
    pub fecha_limite: u64,
    /// Mínimo de fracciones vendidas para que la fiduciaria pueda cerrar antes de tiempo.
    pub minimo_fracciones: u32,
    /// Segundos que tiene la fiduciaria para liberar después del éxito. Si pasan, hay reembolso.
    pub plazo_liberacion: u64,
}

/// Lo que se guarda: la ronda está recaudando, ya se completó o ya se liberó.
#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Estado {
    Recaudando,
    Exitosa,
    Liberada,
}

/// Lo que se muestra: además de lo guardado, una ronda puede estar fallida.
#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum EstadoRonda {
    Recaudando,
    Exitosa,
    Liberada,
    Fallida,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Resumen {
    pub estado: EstadoRonda,
    pub vendidas: u32,
    pub total: u32,
    pub precio_fraccion: i128,
    pub fecha_limite: u64,
    pub recaudado: i128,
    pub minimo_fracciones: u32,
    /// Dinero depositado que todavía no se reclama.
    pub bolsa: i128,
    /// Fracciones que siguen en manos de los tenedores.
    pub en_circulacion: u32,
}

// ---------- Eventos: cada movimiento de dinero queda registrado en la red ----------

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Inversion {
    #[topic]
    pub inversionista: Address,
    pub fracciones: u32,
    pub monto: i128,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Cierre {
    pub vendidas: u32,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Liberacion {
    #[topic]
    pub constructora: Address,
    pub monto: i128,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Reembolso {
    #[topic]
    pub tenedor: Address,
    pub fracciones: u32,
    pub monto: i128,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Deposito {
    #[topic]
    pub fiduciaria: Address,
    pub monto: i128,
}

#[contractevent]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Reclamo {
    #[topic]
    pub tenedor: Address,
    pub fracciones: u32,
    pub monto: i128,
}

#[contract]
pub struct FondeoContract;

#[contractimpl]
impl FondeoContract {
    /// Configura el contrato en la misma transacción del despliegue: no existe un momento
    /// en que el contrato esté desplegado y sin configurar (nadie más puede configurarlo).
    #[allow(clippy::too_many_arguments)]
    pub fn __constructor(
        env: Env,
        fiduciaria: Address,
        constructora: Address,
        token_pago: Address,
        token_participacion: Address,
        precio_fraccion: i128,
        total_fracciones: u32,
        duracion: u64,
        minimo_fracciones: u32,
        plazo_liberacion: u64,
    ) {
        let invalido = precio_fraccion <= 0
            || total_fracciones == 0
            || duracion == 0
            || plazo_liberacion == 0
            || minimo_fracciones == 0
            || minimo_fracciones > total_fracciones
            || precio_fraccion
                .checked_mul(i128::from(total_fracciones))
                .is_none();
        if invalido {
            panic_with_error!(&env, Error::ParametroInvalido);
        }
        let config = Config {
            fiduciaria,
            constructora,
            token_pago,
            token_participacion,
            precio_fraccion,
            total_fracciones,
            fecha_limite: env.ledger().timestamp() + duracion,
            minimo_fracciones,
            plazo_liberacion,
        };
        env.storage().instance().set(&Clave::Config, &config);
        env.storage()
            .instance()
            .set(&Clave::Estado, &Estado::Recaudando);
        env.storage().instance().set(&Clave::Vendidas, &0u32);
        Self::extender_instancia(&env);
    }

    /// Cualquiera compra fracciones: su dinero queda bloqueado en el contrato y
    /// recibe a cambio el activo de Stellar de las fracciones.
    pub fn invertir(env: Env, inversionista: Address, fracciones: u32) -> Result<u32, Error> {
        inversionista.require_auth();
        let config = Self::leer_config(&env)?;
        if fracciones == 0 {
            return Err(Error::FraccionesInvalidas);
        }
        if Self::estado_ronda(&env, &config) != EstadoRonda::Recaudando {
            return Err(Error::RondaCerrada);
        }
        let vendidas = Self::leer_vendidas(&env);
        if fracciones > config.total_fracciones - vendidas {
            return Err(Error::NoHayFracciones);
        }
        let monto = i128::from(fracciones)
            .checked_mul(config.precio_fraccion)
            .ok_or(Error::ParametroInvalido)?;
        let nuevas = vendidas + fracciones;

        // Primero se guarda el estado y después se mueve el dinero y se emiten los tokens.
        env.storage().instance().set(&Clave::Vendidas, &nuevas);
        if nuevas == config.total_fracciones {
            Self::marcar_exitosa(&env);
        }
        Self::extender_instancia(&env);

        token::TokenClient::new(&env, &config.token_pago).transfer(
            &inversionista,
            env.current_contract_address(),
            &monto,
        );
        token::StellarAssetClient::new(&env, &config.token_participacion)
            .mint(&inversionista, &(i128::from(fracciones) * UNIDAD));
        Inversion {
            inversionista,
            fracciones,
            monto,
        }
        .publish(&env);
        Ok(nuevas)
    }

    /// La fiduciaria cierra la ronda antes de tiempo, con lo recaudado hasta ahora.
    /// Solo vale mientras la ronda sigue abierta (antes del plazo) y si ya se vendió el
    /// mínimo pactado, que el inversionista conoce antes de invertir.
    /// Queda exitosa: nadie más invierte y la fiduciaria puede liberar lo recaudado.
    pub fn cerrar(env: Env) -> Result<(), Error> {
        let config = Self::leer_config(&env)?;
        config.fiduciaria.require_auth();
        if Self::estado_ronda(&env, &config) != EstadoRonda::Recaudando {
            return Err(Error::RondaCerrada);
        }
        let vendidas = Self::leer_vendidas(&env);
        if vendidas == 0 {
            return Err(Error::SinInversiones);
        }
        if vendidas < config.minimo_fracciones {
            return Err(Error::MinimoNoAlcanzado);
        }
        Self::marcar_exitosa(&env);
        Self::extender_instancia(&env);
        Cierre { vendidas }.publish(&env);
        Ok(())
    }

    /// La fiduciaria libera el dinero a la constructora cuando la ronda fue exitosa.
    pub fn liberar(env: Env) -> Result<(), Error> {
        let config = Self::leer_config(&env)?;
        config.fiduciaria.require_auth();
        match Self::leer_estado(&env) {
            Estado::Recaudando => return Err(Error::RondaNoExitosa),
            Estado::Liberada => return Err(Error::YaLiberada),
            Estado::Exitosa => {}
        }
        // Si la fiduciaria dejó pasar el plazo de liberación, el dinero vuelve a los inversionistas.
        if Self::estado_ronda(&env, &config) == EstadoRonda::Fallida {
            return Err(Error::PlazoLiberacionVencido);
        }
        let monto = i128::from(Self::leer_vendidas(&env)) * config.precio_fraccion;
        env.storage()
            .instance()
            .set(&Clave::Estado, &Estado::Liberada);
        Self::extender_instancia(&env);
        token::TokenClient::new(&env, &config.token_pago).transfer(
            &env.current_contract_address(),
            &config.constructora,
            &monto,
        );
        Liberacion {
            constructora: config.constructora,
            monto,
        }
        .publish(&env);
        Ok(())
    }

    /// Si la ronda falló, quien tenga fracciones las devuelve (se destruyen) y
    /// recupera su dinero. Sirve también para quien las recibió de otra persona.
    pub fn reembolsar(env: Env, tenedor: Address, fracciones: u32) -> Result<(), Error> {
        tenedor.require_auth();
        let config = Self::leer_config(&env)?;
        if fracciones == 0 {
            return Err(Error::FraccionesInvalidas);
        }
        if Self::estado_ronda(&env, &config) != EstadoRonda::Fallida {
            return Err(Error::RondaNoFallida);
        }
        let tokens = i128::from(fracciones) * UNIDAD;
        let activo = token::TokenClient::new(&env, &config.token_participacion);
        if activo.balance(&tenedor) < tokens {
            return Err(Error::SaldoInsuficiente);
        }
        // Solo se reembolsan fracciones que vendió el contrato: si aparecen de más, se detiene.
        let vendidas = Self::leer_vendidas(&env);
        if fracciones > vendidas {
            return Err(Error::Descuadre);
        }
        let monto = i128::from(fracciones) * config.precio_fraccion;
        env.storage()
            .instance()
            .set(&Clave::Vendidas, &(vendidas - fracciones));
        Self::extender_instancia(&env);

        activo.burn(&tenedor, &tokens);
        token::TokenClient::new(&env, &config.token_pago).transfer(
            &env.current_contract_address(),
            &tenedor,
            &monto,
        );
        Reembolso {
            tenedor,
            fracciones,
            monto,
        }
        .publish(&env);
        Ok(())
    }

    /// La fiduciaria deposita en el contrato el dinero de la liquidación del proyecto
    /// (capital más ganancias). Queda en la bolsa hasta que cada tenedor reclame su parte.
    pub fn depositar(env: Env, monto: i128) -> Result<(), Error> {
        let config = Self::leer_config(&env)?;
        config.fiduciaria.require_auth();
        if monto <= 0 {
            return Err(Error::ParametroInvalido);
        }
        if Self::leer_estado(&env) != Estado::Liberada {
            return Err(Error::RondaNoLiberada);
        }
        let bolsa = Self::leer_bolsa(&env)
            .checked_add(monto)
            .ok_or(Error::ParametroInvalido)?;
        env.storage().instance().set(&Clave::Bolsa, &bolsa);
        Self::extender_instancia(&env);
        token::TokenClient::new(&env, &config.token_pago).transfer(
            &config.fiduciaria,
            env.current_contract_address(),
            &monto,
        );
        Deposito {
            fiduciaria: config.fiduciaria,
            monto,
        }
        .publish(&env);
        Ok(())
    }

    /// Cada tenedor reclama su parte de la bolsa («pull»): entrega fracciones, que se
    /// destruyen, y recibe la parte proporcional. El contrato nunca recorre listas, así
    /// que funciona igual con 10 que con 10 000 inversionistas.
    pub fn reclamar(env: Env, tenedor: Address, fracciones: u32) -> Result<i128, Error> {
        tenedor.require_auth();
        let config = Self::leer_config(&env)?;
        if fracciones == 0 {
            return Err(Error::FraccionesInvalidas);
        }
        if Self::leer_estado(&env) != Estado::Liberada {
            return Err(Error::RondaNoLiberada);
        }
        let bolsa = Self::leer_bolsa(&env);
        if bolsa <= 0 {
            return Err(Error::SinGanancias);
        }
        let tokens = i128::from(fracciones) * UNIDAD;
        let activo = token::TokenClient::new(&env, &config.token_participacion);
        if activo.balance(&tenedor) < tokens {
            return Err(Error::SaldoInsuficiente);
        }
        let liquidadas = Self::leer_liquidadas(&env);
        let en_circulacion = Self::leer_vendidas(&env) - liquidadas;
        if fracciones > en_circulacion {
            return Err(Error::Descuadre);
        }
        // Quien reclama las últimas fracciones se lleva lo que quede (no se pierde el redondeo).
        let monto = if fracciones == en_circulacion {
            bolsa
        } else {
            bolsa
                .checked_mul(i128::from(fracciones))
                .ok_or(Error::ParametroInvalido)?
                / i128::from(en_circulacion)
        };
        env.storage()
            .instance()
            .set(&Clave::Bolsa, &(bolsa - monto));
        env.storage()
            .instance()
            .set(&Clave::Liquidadas, &(liquidadas + fracciones));
        Self::extender_instancia(&env);

        activo.burn(&tenedor, &tokens);
        token::TokenClient::new(&env, &config.token_pago).transfer(
            &env.current_contract_address(),
            &tenedor,
            &monto,
        );
        Reclamo {
            tenedor,
            fracciones,
            monto,
        }
        .publish(&env);
        Ok(monto)
    }

    /// Cualquiera puede mantener vivo el contrato (extiende su tiempo de vida en la red).
    pub fn mantener(env: Env) {
        Self::extender_instancia(&env);
    }

    /// Lectura: el estado de la ronda.
    pub fn resumen(env: Env) -> Result<Resumen, Error> {
        let config = Self::leer_config(&env)?;
        let vendidas = Self::leer_vendidas(&env);
        Ok(Resumen {
            estado: Self::estado_ronda(&env, &config),
            vendidas,
            total: config.total_fracciones,
            precio_fraccion: config.precio_fraccion,
            fecha_limite: config.fecha_limite,
            recaudado: i128::from(vendidas) * config.precio_fraccion,
            minimo_fracciones: config.minimo_fracciones,
            bolsa: Self::leer_bolsa(&env),
            en_circulacion: vendidas - Self::leer_liquidadas(&env),
        })
    }

    /// Lectura: la configuración del contrato.
    pub fn config(env: Env) -> Result<Config, Error> {
        Self::leer_config(&env)
    }
}

impl FondeoContract {
    fn leer_config(env: &Env) -> Result<Config, Error> {
        env.storage()
            .instance()
            .get(&Clave::Config)
            .ok_or(Error::NoInicializado)
    }

    fn leer_estado(env: &Env) -> Estado {
        env.storage()
            .instance()
            .get(&Clave::Estado)
            .unwrap_or(Estado::Recaudando)
    }

    fn leer_vendidas(env: &Env) -> u32 {
        env.storage().instance().get(&Clave::Vendidas).unwrap_or(0)
    }

    fn leer_bolsa(env: &Env) -> i128 {
        env.storage().instance().get(&Clave::Bolsa).unwrap_or(0)
    }

    fn leer_liquidadas(env: &Env) -> u32 {
        env.storage()
            .instance()
            .get(&Clave::Liquidadas)
            .unwrap_or(0)
    }

    fn marcar_exitosa(env: &Env) {
        env.storage()
            .instance()
            .set(&Clave::Estado, &Estado::Exitosa);
        env.storage()
            .instance()
            .set(&Clave::FechaExito, &env.ledger().timestamp());
    }

    /// La ronda fallida no se guarda, se calcula: es la que sigue recaudando cuando ya pasó
    /// el plazo, o la exitosa que la fiduciaria no liberó dentro del plazo de liberación.
    fn estado_ronda(env: &Env, config: &Config) -> EstadoRonda {
        match Self::leer_estado(env) {
            Estado::Liberada => EstadoRonda::Liberada,
            Estado::Exitosa => {
                let desde: u64 = env
                    .storage()
                    .instance()
                    .get(&Clave::FechaExito)
                    .unwrap_or(config.fecha_limite);
                if env.ledger().timestamp() >= desde.saturating_add(config.plazo_liberacion) {
                    EstadoRonda::Fallida
                } else {
                    EstadoRonda::Exitosa
                }
            }
            Estado::Recaudando => {
                if env.ledger().timestamp() >= config.fecha_limite {
                    EstadoRonda::Fallida
                } else {
                    EstadoRonda::Recaudando
                }
            }
        }
    }

    fn extender_instancia(env: &Env) {
        // Hasta el máximo que permite la red; se renueva en cada operación y con `mantener`.
        let maximo = env.storage().max_ttl();
        env.storage()
            .instance()
            .extend_ttl(maximo.saturating_sub(DIA_EN_LEDGERS), maximo);
    }
}

mod test;
