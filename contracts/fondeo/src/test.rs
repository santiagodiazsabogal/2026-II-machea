#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger, MockAuth, MockAuthInvoke},
    token::{StellarAssetClient, TokenClient},
    Address, Env, IntoVal,
};

const PRECIO: i128 = 1_000;
const TOTAL: u32 = 10;
const DURACION: u64 = 7 * 24 * 60 * 60;
/// Plazo que tiene la fiduciaria para liberar después del éxito.
const PLAZO_LIBERACION: u64 = 30 * 24 * 60 * 60;

struct Escenario<'a> {
    env: Env,
    cliente: FondeoContractClient<'a>,
    pago: TokenClient<'a>,
    fracciones: TokenClient<'a>,
    fiduciaria: Address,
    constructora: Address,
}

/// Ronda con mínimo de cierre de 1 fracción (el caso más permisivo).
fn preparar<'a>() -> Escenario<'a> {
    preparar_con_minimo(1)
}

fn preparar_con_minimo<'a>(minimo: u32) -> Escenario<'a> {
    let env = Env::default();
    env.mock_all_auths();

    let admin_pago = Address::generate(&env);
    let pago_id = env.register_stellar_asset_contract_v2(admin_pago).address();

    // El activo de las fracciones lo emite una cuenta emisora, que luego le
    // entrega al contrato la administración del activo.
    let emisor = Address::generate(&env);
    let fracciones_id = env.register_stellar_asset_contract_v2(emisor).address();

    let fiduciaria = Address::generate(&env);
    let constructora = Address::generate(&env);
    // El contrato se configura en el mismo despliegue (constructor).
    let contrato = env.register(
        FondeoContract,
        (
            fiduciaria.clone(),
            constructora.clone(),
            pago_id.clone(),
            fracciones_id.clone(),
            PRECIO,
            TOTAL,
            DURACION,
            minimo,
            PLAZO_LIBERACION,
        ),
    );
    StellarAssetClient::new(&env, &fracciones_id).set_admin(&contrato);
    let cliente = FondeoContractClient::new(&env, &contrato);

    Escenario {
        pago: TokenClient::new(&env, &pago_id),
        fracciones: TokenClient::new(&env, &fracciones_id),
        env,
        cliente,
        fiduciaria,
        constructora,
    }
}

/// Una wallet nueva con saldo para pagar.
fn inversionista(e: &Escenario, saldo: i128) -> Address {
    let a = Address::generate(&e.env);
    StellarAssetClient::new(&e.env, &e.pago.address).mint(&a, &saldo);
    a
}

/// Alguien compra todas las fracciones y cierra la ronda.
fn llenar(e: &Escenario) -> Address {
    let w = inversionista(e, i128::from(TOTAL) * PRECIO);
    e.cliente.invertir(&w, &TOTAL);
    w
}

fn pasar_el_plazo(e: &Escenario) {
    e.env
        .ledger()
        .set_timestamp(e.env.ledger().timestamp() + DURACION);
}

fn registrar(env: &Env, precio: i128, total: u32, duracion: u64, minimo: u32, plazo: u64) {
    let a = Address::generate(env);
    env.register(
        FondeoContract,
        (
            a.clone(),
            a.clone(),
            a.clone(),
            a.clone(),
            precio,
            total,
            duracion,
            minimo,
            plazo,
        ),
    );
}

#[test]
fn el_constructor_guarda_la_configuracion() {
    let e = preparar_con_minimo(7);
    let config = e.cliente.config();
    assert_eq!(config.fiduciaria, e.fiduciaria);
    assert_eq!(config.constructora, e.constructora);
    assert_eq!(config.minimo_fracciones, 7);
    assert_eq!(config.plazo_liberacion, PLAZO_LIBERACION);
    let r = e.cliente.resumen();
    assert_eq!(r.estado, EstadoRonda::Recaudando);
    assert_eq!(r.minimo_fracciones, 7);
    assert_eq!(r.bolsa, 0);
}

#[test]
#[should_panic]
fn constructor_con_precio_cero_falla() {
    registrar(&Env::default(), 0, TOTAL, DURACION, 1, PLAZO_LIBERACION);
}

#[test]
#[should_panic]
fn constructor_con_total_cero_falla() {
    registrar(&Env::default(), PRECIO, 0, DURACION, 1, PLAZO_LIBERACION);
}

#[test]
#[should_panic]
fn constructor_con_duracion_cero_falla() {
    registrar(&Env::default(), PRECIO, TOTAL, 0, 1, PLAZO_LIBERACION);
}

#[test]
#[should_panic]
fn constructor_con_minimo_mayor_que_el_total_falla() {
    registrar(
        &Env::default(),
        PRECIO,
        TOTAL,
        DURACION,
        TOTAL + 1,
        PLAZO_LIBERACION,
    );
}

#[test]
#[should_panic]
fn constructor_con_minimo_cero_falla() {
    registrar(
        &Env::default(),
        PRECIO,
        TOTAL,
        DURACION,
        0,
        PLAZO_LIBERACION,
    );
}

#[test]
fn invertir_bloquea_fondos_y_entrega_tokens() {
    let e = preparar();
    let ana = inversionista(&e, 10_000);
    let vendidas = e.cliente.invertir(&ana, &3);
    assert_eq!(vendidas, 3);
    assert_eq!(e.pago.balance(&ana), 10_000 - 3 * PRECIO);
    assert_eq!(e.pago.balance(&e.cliente.address), 3 * PRECIO);
    assert_eq!(e.fracciones.balance(&ana), 3 * UNIDAD);
    let r = e.cliente.resumen();
    assert_eq!(r.estado, EstadoRonda::Recaudando);
    assert_eq!(r.vendidas, 3);
    assert_eq!(r.recaudado, 3 * PRECIO);
}

#[test]
fn invertir_cero_falla() {
    let e = preparar();
    let ana = inversionista(&e, 10_000);
    assert_eq!(
        e.cliente.try_invertir(&ana, &0),
        Err(Ok(Error::FraccionesInvalidas))
    );
}

#[test]
fn invertir_mas_de_las_disponibles_falla() {
    let e = preparar();
    let ana = inversionista(&e, 100_000);
    assert_eq!(
        e.cliente.try_invertir(&ana, &(TOTAL + 1)),
        Err(Ok(Error::NoHayFracciones))
    );
}

#[test]
#[should_panic]
fn invertir_sin_firma_falla() {
    let e = preparar();
    let ana = inversionista(&e, 10_000);
    e.env.mock_auths(&[]);
    e.cliente.invertir(&ana, &1);
}

#[test]
fn invertir_despues_del_plazo_falla() {
    let e = preparar();
    let ana = inversionista(&e, 10_000);
    pasar_el_plazo(&e);
    assert_eq!(
        e.cliente.try_invertir(&ana, &1),
        Err(Ok(Error::RondaCerrada))
    );
}

#[test]
fn la_ultima_fraccion_cierra_la_ronda() {
    let e = preparar();
    llenar(&e);
    let r = e.cliente.resumen();
    assert_eq!(r.estado, EstadoRonda::Exitosa);
    assert_eq!(r.vendidas, TOTAL);
}

#[test]
fn invertir_con_la_ronda_exitosa_falla() {
    let e = preparar();
    llenar(&e);
    let otro = inversionista(&e, 10_000);
    assert_eq!(
        e.cliente.try_invertir(&otro, &1),
        Err(Ok(Error::RondaCerrada))
    );
}

#[test]
fn cualquiera_puede_invertir() {
    let e = preparar();
    let uno = inversionista(&e, 5_000);
    let dos = inversionista(&e, 5_000);
    e.cliente.invertir(&uno, &1);
    e.cliente.invertir(&dos, &2);
    assert_eq!(e.fracciones.balance(&uno), UNIDAD);
    assert_eq!(e.fracciones.balance(&dos), 2 * UNIDAD);
}

#[test]
fn liberar_envia_a_la_constructora() {
    let e = preparar();
    llenar(&e);
    e.cliente.liberar();
    assert_eq!(e.pago.balance(&e.constructora), i128::from(TOTAL) * PRECIO);
    assert_eq!(e.pago.balance(&e.cliente.address), 0);
    assert_eq!(e.cliente.resumen().estado, EstadoRonda::Liberada);
}

#[test]
#[should_panic]
fn liberar_sin_firma_de_la_fiduciaria_falla() {
    let e = preparar();
    llenar(&e);
    e.env.mock_auths(&[]);
    e.cliente.liberar();
}

#[test]
fn liberar_antes_de_la_meta_falla() {
    let e = preparar();
    let ana = inversionista(&e, 10_000);
    e.cliente.invertir(&ana, &1);
    assert_eq!(e.cliente.try_liberar(), Err(Ok(Error::RondaNoExitosa)));
}

#[test]
fn liberar_dos_veces_falla() {
    let e = preparar();
    llenar(&e);
    e.cliente.liberar();
    assert_eq!(e.cliente.try_liberar(), Err(Ok(Error::YaLiberada)));
}

#[test]
fn reembolsar_tras_fallar_destruye_tokens_y_devuelve_dinero() {
    let e = preparar();
    let ana = inversionista(&e, 10_000);
    e.cliente.invertir(&ana, &4);
    pasar_el_plazo(&e);
    assert_eq!(e.cliente.resumen().estado, EstadoRonda::Fallida);
    e.cliente.reembolsar(&ana, &4);
    assert_eq!(e.pago.balance(&ana), 10_000);
    assert_eq!(e.fracciones.balance(&ana), 0);
    assert_eq!(e.pago.balance(&e.cliente.address), 0);
    assert_eq!(e.cliente.resumen().vendidas, 0);
}

#[test]
fn reembolsar_antes_del_plazo_falla() {
    let e = preparar();
    let ana = inversionista(&e, 10_000);
    e.cliente.invertir(&ana, &1);
    assert_eq!(
        e.cliente.try_reembolsar(&ana, &1),
        Err(Ok(Error::RondaNoFallida))
    );
}

#[test]
fn reembolsar_con_la_ronda_exitosa_falla() {
    let e = preparar();
    let w = llenar(&e);
    pasar_el_plazo(&e);
    assert_eq!(
        e.cliente.try_reembolsar(&w, &1),
        Err(Ok(Error::RondaNoFallida))
    );
}

#[test]
fn reembolsar_mas_tokens_de_los_que_tiene_falla() {
    let e = preparar();
    let ana = inversionista(&e, 10_000);
    e.cliente.invertir(&ana, &2);
    pasar_el_plazo(&e);
    assert_eq!(
        e.cliente.try_reembolsar(&ana, &3),
        Err(Ok(Error::SaldoInsuficiente))
    );
}

#[test]
fn reembolsa_quien_recibio_los_tokens_por_transferencia() {
    let e = preparar();
    let ana = inversionista(&e, 10_000);
    let luis = Address::generate(&e.env);
    e.cliente.invertir(&ana, &2);
    e.fracciones.transfer(&ana, &luis, &(2 * UNIDAD));
    pasar_el_plazo(&e);
    e.cliente.reembolsar(&luis, &2);
    assert_eq!(e.pago.balance(&luis), 2 * PRECIO);
    assert_eq!(e.fracciones.balance(&luis), 0);
    assert_eq!(e.pago.balance(&ana), 10_000 - 2 * PRECIO);
}

#[test]
fn los_tokens_se_pueden_transferir() {
    let e = preparar();
    let ana = inversionista(&e, 10_000);
    let luis = Address::generate(&e.env);
    e.cliente.invertir(&ana, &2);
    e.fracciones.transfer(&ana, &luis, &UNIDAD);
    assert_eq!(e.fracciones.balance(&ana), UNIDAD);
    assert_eq!(e.fracciones.balance(&luis), UNIDAD);
}

// Las dos pruebas siguientes no dan por autorizado todo: solo firma quien
// debe firmar. La emisión y la destrucción de tokens por parte del contrato
// tienen que funcionar sin ninguna firma extra.

#[test]
fn invertir_funciona_solo_con_la_firma_del_inversionista() {
    let e = preparar();
    let ana = inversionista(&e, 10_000);
    let fracciones: u32 = 2;
    let monto = i128::from(fracciones) * PRECIO;
    e.env.mock_auths(&[MockAuth {
        address: &ana,
        invoke: &MockAuthInvoke {
            contract: &e.cliente.address,
            fn_name: "invertir",
            args: (ana.clone(), fracciones).into_val(&e.env),
            sub_invokes: &[MockAuthInvoke {
                contract: &e.pago.address,
                fn_name: "transfer",
                args: (ana.clone(), e.cliente.address.clone(), monto).into_val(&e.env),
                sub_invokes: &[],
            }],
        },
    }]);
    e.cliente.invertir(&ana, &fracciones);
    assert_eq!(e.fracciones.balance(&ana), i128::from(fracciones) * UNIDAD);
}

#[test]
fn reembolsar_funciona_solo_con_la_firma_del_tenedor() {
    let e = preparar();
    let ana = inversionista(&e, 10_000);
    let fracciones: u32 = 2;
    e.cliente.invertir(&ana, &fracciones);
    pasar_el_plazo(&e);
    let tokens = i128::from(fracciones) * UNIDAD;
    e.env.mock_auths(&[MockAuth {
        address: &ana,
        invoke: &MockAuthInvoke {
            contract: &e.cliente.address,
            fn_name: "reembolsar",
            args: (ana.clone(), fracciones).into_val(&e.env),
            sub_invokes: &[MockAuthInvoke {
                contract: &e.fracciones.address,
                fn_name: "burn",
                args: (ana.clone(), tokens).into_val(&e.env),
                sub_invokes: &[],
            }],
        },
    }]);
    e.cliente.reembolsar(&ana, &fracciones);
    assert_eq!(e.fracciones.balance(&ana), 0);
    assert_eq!(e.pago.balance(&ana), 10_000);
}

// ---------- Cierre anticipado ----------

#[test]
fn cerrar_con_inversiones_deja_la_ronda_exitosa_y_se_puede_liberar() {
    let e = preparar();
    let ana = inversionista(&e, 10_000);
    e.cliente.invertir(&ana, &3);
    e.cliente.cerrar();
    let r = e.cliente.resumen();
    assert_eq!(r.estado, EstadoRonda::Exitosa);
    assert_eq!(r.vendidas, 3);
    e.cliente.liberar();
    assert_eq!(e.pago.balance(&e.constructora), 3 * PRECIO);
    assert_eq!(e.pago.balance(&e.cliente.address), 0);
}

#[test]
fn cerrar_sin_inversiones_falla() {
    let e = preparar();
    assert_eq!(e.cliente.try_cerrar(), Err(Ok(Error::SinInversiones)));
}

#[test]
fn despues_de_cerrar_nadie_mas_invierte() {
    let e = preparar();
    let ana = inversionista(&e, 10_000);
    e.cliente.invertir(&ana, &1);
    e.cliente.cerrar();
    assert_eq!(
        e.cliente.try_invertir(&ana, &1),
        Err(Ok(Error::RondaCerrada))
    );
}

#[test]
fn cerrar_dos_veces_falla() {
    let e = preparar();
    let ana = inversionista(&e, 10_000);
    e.cliente.invertir(&ana, &1);
    e.cliente.cerrar();
    assert_eq!(e.cliente.try_cerrar(), Err(Ok(Error::RondaCerrada)));
}

#[test]
fn cerrar_una_ronda_llena_falla() {
    let e = preparar();
    llenar(&e);
    assert_eq!(e.cliente.try_cerrar(), Err(Ok(Error::RondaCerrada)));
}

#[test]
fn cerrar_despues_del_plazo_falla_y_se_conserva_el_reembolso() {
    let e = preparar();
    let ana = inversionista(&e, 10_000);
    e.cliente.invertir(&ana, &2);
    pasar_el_plazo(&e);
    assert_eq!(e.cliente.try_cerrar(), Err(Ok(Error::RondaCerrada)));
    e.cliente.reembolsar(&ana, &2);
    assert_eq!(e.pago.balance(&ana), 10_000);
}

#[test]
fn cerrar_no_permite_reembolsar() {
    let e = preparar();
    let ana = inversionista(&e, 10_000);
    e.cliente.invertir(&ana, &2);
    e.cliente.cerrar();
    pasar_el_plazo(&e);
    assert_eq!(
        e.cliente.try_reembolsar(&ana, &2),
        Err(Ok(Error::RondaNoFallida))
    );
}

#[test]
#[should_panic]
fn cerrar_sin_firma_de_la_fiduciaria_falla() {
    let e = preparar();
    let ana = inversionista(&e, 10_000);
    e.cliente.invertir(&ana, &1);
    e.env.mock_auths(&[]);
    e.cliente.cerrar();
}

// ---------- Mínimo de cierre (hallazgo H1) ----------

#[test]
fn cerrar_por_debajo_del_minimo_falla_y_se_conserva_el_reembolso() {
    let e = preparar_con_minimo(7);
    let ana = inversionista(&e, 10_000);
    e.cliente.invertir(&ana, &6);
    assert_eq!(e.cliente.try_cerrar(), Err(Ok(Error::MinimoNoAlcanzado)));
    assert_eq!(e.cliente.try_liberar(), Err(Ok(Error::RondaNoExitosa)));
    pasar_el_plazo(&e);
    e.cliente.reembolsar(&ana, &6);
    assert_eq!(e.pago.balance(&ana), 10_000);
}

#[test]
fn cerrar_desde_el_minimo_funciona() {
    let e = preparar_con_minimo(7);
    let ana = inversionista(&e, 10_000);
    e.cliente.invertir(&ana, &7);
    e.cliente.cerrar();
    e.cliente.liberar();
    assert_eq!(e.pago.balance(&e.constructora), 7 * PRECIO);
}

// ---------- Plazo de liberación (hallazgo H4) ----------

fn pasar_el_plazo_de_liberacion(e: &Escenario) {
    e.env
        .ledger()
        .set_timestamp(e.env.ledger().timestamp() + PLAZO_LIBERACION);
}

#[test]
fn exitosa_sin_liberar_vuelve_a_ser_reembolsable() {
    let e = preparar();
    let ana = llenar(&e);
    assert_eq!(e.cliente.resumen().estado, EstadoRonda::Exitosa);
    pasar_el_plazo_de_liberacion(&e);
    assert_eq!(e.cliente.resumen().estado, EstadoRonda::Fallida);
    assert_eq!(
        e.cliente.try_liberar(),
        Err(Ok(Error::PlazoLiberacionVencido))
    );
    e.cliente.reembolsar(&ana, &TOTAL);
    assert_eq!(e.pago.balance(&ana), i128::from(TOTAL) * PRECIO);
    assert_eq!(e.pago.balance(&e.cliente.address), 0);
}

#[test]
fn liberar_dentro_del_plazo_funciona_y_ya_no_hay_reembolso() {
    let e = preparar();
    let ana = llenar(&e);
    e.cliente.liberar();
    pasar_el_plazo_de_liberacion(&e);
    assert_eq!(e.cliente.resumen().estado, EstadoRonda::Liberada);
    assert_eq!(
        e.cliente.try_reembolsar(&ana, &1),
        Err(Ok(Error::RondaNoFallida))
    );
}

// ---------- Descuadre (hallazgo H2) ----------

#[test]
fn no_se_reembolsan_mas_fracciones_de_las_que_vendio_el_contrato() {
    let e = preparar();
    let ana = inversionista(&e, 10_000);
    e.cliente.invertir(&ana, &4);
    // Ana le pasa sus fracciones a Beto: él tiene 4, pero pide el reembolso de 5.
    let beto = Address::generate(&e.env);
    e.fracciones.transfer(&ana, &beto, &(4 * UNIDAD));
    pasar_el_plazo(&e);
    assert_eq!(
        e.cliente.try_reembolsar(&beto, &5),
        Err(Ok(Error::SaldoInsuficiente))
    );
    e.cliente.reembolsar(&beto, &4);
    assert_eq!(e.cliente.resumen().vendidas, 0);
    assert_eq!(e.pago.balance(&e.cliente.address), 0);
}

// ---------- Bolsa de liquidación y reclamo «pull» (hallazgo H6) ----------

/// Ronda llena y liberada: Ana tiene 6 fracciones y Beto 4.
fn ronda_liberada<'a>() -> (Escenario<'a>, Address, Address) {
    let e = preparar();
    let ana = inversionista(&e, 6 * PRECIO);
    let beto = inversionista(&e, 4 * PRECIO);
    e.cliente.invertir(&ana, &6);
    e.cliente.invertir(&beto, &4);
    e.cliente.liberar();
    (e, ana, beto)
}

fn fondear_fiduciaria(e: &Escenario, monto: i128) {
    StellarAssetClient::new(&e.env, &e.pago.address).mint(&e.fiduciaria, &monto);
}

#[test]
fn depositar_y_reclamar_reparte_en_proporcion() {
    let (e, ana, beto) = ronda_liberada();
    fondear_fiduciaria(&e, 12_500);
    e.cliente.depositar(&12_500);
    assert_eq!(e.pago.balance(&e.cliente.address), 12_500);
    assert_eq!(e.cliente.resumen().bolsa, 12_500);

    assert_eq!(e.cliente.reclamar(&ana, &6), 7_500);
    assert_eq!(e.pago.balance(&ana), 7_500);
    assert_eq!(e.fracciones.balance(&ana), 0);

    assert_eq!(e.cliente.reclamar(&beto, &4), 5_000);
    assert_eq!(e.pago.balance(&beto), 5_000);

    let r = e.cliente.resumen();
    assert_eq!(r.bolsa, 0);
    assert_eq!(r.en_circulacion, 0);
    assert_eq!(e.pago.balance(&e.cliente.address), 0);
}

#[test]
fn reclamar_por_partes_da_lo_mismo_y_el_ultimo_se_lleva_el_redondeo() {
    let (e, ana, beto) = ronda_liberada();
    fondear_fiduciaria(&e, 1_003);
    e.cliente.depositar(&1_003);
    // 1 003 entre 10 fracciones: 100 por fracción y sobran 3.
    assert_eq!(e.cliente.reclamar(&ana, &3), 300);
    assert_eq!(e.cliente.reclamar(&beto, &4), 401);
    assert_eq!(e.cliente.reclamar(&ana, &3), 302);
    assert_eq!(e.pago.balance(&e.cliente.address), 0);
}

#[test]
fn reclama_quien_recibio_las_fracciones_por_transferencia() {
    let (e, ana, _beto) = ronda_liberada();
    let carla = Address::generate(&e.env);
    e.fracciones.transfer(&ana, &carla, &(6 * UNIDAD));
    fondear_fiduciaria(&e, 10_000);
    e.cliente.depositar(&10_000);
    assert_eq!(e.cliente.reclamar(&carla, &6), 6_000);
    assert_eq!(
        e.cliente.try_reclamar(&ana, &1),
        Err(Ok(Error::SaldoInsuficiente))
    );
}

#[test]
fn depositar_antes_de_liberar_falla() {
    let e = preparar();
    llenar(&e);
    fondear_fiduciaria(&e, 1_000);
    assert_eq!(
        e.cliente.try_depositar(&1_000),
        Err(Ok(Error::RondaNoLiberada))
    );
}

#[test]
fn depositar_cero_falla() {
    let (e, _ana, _beto) = ronda_liberada();
    assert_eq!(
        e.cliente.try_depositar(&0),
        Err(Ok(Error::ParametroInvalido))
    );
}

#[test]
fn reclamar_antes_de_liberar_falla() {
    let e = preparar();
    let ana = llenar(&e);
    assert_eq!(
        e.cliente.try_reclamar(&ana, &1),
        Err(Ok(Error::RondaNoLiberada))
    );
}

#[test]
fn reclamar_sin_dinero_en_la_bolsa_falla() {
    let (e, ana, _beto) = ronda_liberada();
    assert_eq!(
        e.cliente.try_reclamar(&ana, &1),
        Err(Ok(Error::SinGanancias))
    );
}

#[test]
fn reclamar_mas_fracciones_de_las_que_tiene_falla() {
    let (e, _ana, beto) = ronda_liberada();
    fondear_fiduciaria(&e, 1_000);
    e.cliente.depositar(&1_000);
    assert_eq!(
        e.cliente.try_reclamar(&beto, &5),
        Err(Ok(Error::SaldoInsuficiente))
    );
}

#[test]
#[should_panic]
fn depositar_sin_firma_de_la_fiduciaria_falla() {
    let (e, _ana, _beto) = ronda_liberada();
    fondear_fiduciaria(&e, 1_000);
    e.env.mock_auths(&[]);
    e.cliente.depositar(&1_000);
}

#[test]
fn mantener_lo_puede_llamar_cualquiera() {
    let e = preparar();
    e.env.mock_auths(&[]);
    e.cliente.mantener();
}
