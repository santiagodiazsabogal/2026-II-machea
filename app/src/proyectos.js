// Catálogo de proyectos de Machea (ficticios, solo para el prototipo en testnet).
// Cada proyecto tiene su propia ronda de fondeo en la red: un contrato y un activo de Stellar.
// El contrato solo guarda meta, precio y plazo; el nombre, la zona, la imagen y los supuestos financieros viven aquí.
//
// Los supuestos (unidades, áreas, precio por m², márgenes, arriendo) están explicados, con sus fuentes y límites,
// en Docs/MODELO_FINANCIERO.md. Con ellos finanzas.js calcula la ficha financiera de cada proyecto.

const imagen = (archivo) => new URL(`./assets/proyectos/${archivo}`, import.meta.url).href;

/** Cuenta que emitió los activos de las rondas del catálogo. */
export const EMISOR_DE_LAS_RONDAS = "GAK6FDVYLICN6GTW7TVEZJ65PWNM3OV474PMWQKBYS6VYPL2PLTV2SYB";

export const PROYECTOS = [
  {
    id: "cedros",
    numero: 1,
    nombre: "Mirador de los Cedros",
    zona: "Cedritos, Usaquén, Bogotá",
    descripcion: "Apartamentos familiares de 2 y 3 habitaciones, zonas verdes y coworking.",
    imagen: imagen("cedros.jpg"),
    limite: "2026-11-26",
    contrato: "CAJISXLJQL67VLMTJSLD2BVE2GFVIEYYAZB5AW3JFR4K3PSSHI7XKLE4",
    codigo: "CEDROS",
    fracciones: 1200,
    precioFraccionXlm: 10, // $1.000.000 COP por fracción
    modelo: "venta",
    unidades: 24,
    areaM2: 72,
    precioM2: 7_400_000,
    margenSobreVentas: 0.2,
    plazoMeses: 24,
  },
  {
    id: "urban85",
    numero: 2,
    nombre: "Urban 85",
    zona: "Chapinero Alto, Bogotá",
    descripcion: "Apartaestudios modernos orientados a jóvenes profesionales y alquiler residencial.",
    imagen: imagen("urban85.jpg"),
    limite: "2026-11-30",
    contrato: "CDPFBFVLPAIVU7QZ3AVTX2E257VBR37FWHKHQSMCIXBHGHFHLDTG2AMI",
    codigo: "URBAN85",
    fracciones: 1500,
    precioFraccionXlm: 8, // $800.000 COP
    modelo: "renta",
    unidades: 20,
    areaM2: 30,
    precioM2: 9_100_000, // valor del edificio por m²
    rentaM2Mes: 55_000,
    mesesVacios: 1,
    gastosSobreRenta: 0.18,
  },
  {
    id: "salitre",
    numero: 3,
    nombre: "Reserva del Salitre",
    zona: "Salitre, Fontibón, Bogotá",
    descripcion: "Proyecto residencial con terrazas, gimnasio y espacios familiares.",
    imagen: imagen("salitre.jpg"),
    limite: "2026-12-04",
    contrato: "CCLECZ3KH4NRDDIYEBTON376K4FN6H3GMEREKYAMNGLFKU6C6IJ27R7M",
    codigo: "SALITRE",
    fracciones: 800,
    precioFraccionXlm: 15, // $1.500.000 COP
    modelo: "venta",
    unidades: 18,
    areaM2: 68,
    precioM2: 6_500_000,
    margenSobreVentas: 0.2,
    plazoMeses: 28,
  },
  {
    id: "horizonte",
    numero: 4,
    nombre: "Horizonte Verde",
    zona: "Bosa, Bogotá",
    descripcion: "Vivienda de interés social con áreas comunales y comercio cercano.",
    imagen: imagen("horizonte.jpg"),
    limite: "2026-12-08",
    contrato: "CD2AZRYYQXFMGYNQJBEGN23NU7UTYNU5TMZZUSVDZ6ZYOERVJYPYWASJ",
    codigo: "HORIZONTE",
    fracciones: 2000,
    precioFraccionXlm: 5, // $500.000 COP
    modelo: "venta",
    unidades: 60,
    areaM2: 45,
    precioM2: 5_000_000, // cada apartamento: $225 M, por debajo del tope VIS de 135 salarios mínimos (~$236 M)
    margenSobreVentas: 0.12, // la vivienda de interés social deja menos margen
    plazoMeses: 30,
  },
  {
    id: "rosales",
    numero: 5,
    nombre: "Altos de Rosales",
    zona: "Rosales, Chapinero, Bogotá",
    descripcion: "Apartamentos exclusivos con terrazas privadas y diseño contemporáneo.",
    imagen: imagen("rosales.jpg"),
    limite: "2026-12-12",
    contrato: "CAVBA76FTW4QOIQAHCIS75PFDNHYIDCYD5PF7DAKD2SHKUCK75UONR3R",
    codigo: "ROSALES",
    fracciones: 1000,
    precioFraccionXlm: 12, // $1.200.000 COP
    modelo: "venta",
    unidades: 10,
    areaM2: 120,
    precioM2: 14_000_000,
    margenSobreVentas: 0.2,
    plazoMeses: 30,
  },
  {
    id: "colina",
    numero: 6,
    nombre: "Colina Park Living",
    zona: "Colina Campestre, Suba, Bogotá",
    descripcion: "Conjunto residencial con senderos peatonales, gimnasio y zonas sociales.",
    imagen: imagen("colina.jpg"),
    limite: "2026-12-18",
    contrato: "CADTPSHEZ74ZZDPBKMR35XQ4CZPTL2NNH3A5SNOFLSQ2N4ES5KTMUYWG",
    codigo: "COLINA",
    fracciones: 1600,
    precioFraccionXlm: 10, // $1.000.000 COP
    modelo: "venta",
    unidades: 40,
    areaM2: 65,
    precioM2: 6_900_000,
    margenSobreVentas: 0.2,
    plazoMeses: 36,
  },
];

// Para las rondas que no están en el catálogo (por ejemplo, las de pruebas con demo/ronda.sh): sin ficha financiera.
export const PROYECTO_GENERICO = {
  id: "alameda",
  nombre: "Residencial Alameda",
  zona: "Chapinero, Bogotá",
  descripcion: "Proyecto de ejemplo de las primeras pruebas.",
  imagen: null,
};

export const buscarProyecto = (id) => PROYECTOS.find((p) => p.id === id) || null;
export const proyectoDeContrato = (contrato) => PROYECTOS.find((p) => p.contrato && p.contrato === contrato) || null;
