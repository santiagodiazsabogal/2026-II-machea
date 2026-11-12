// Reparto de ganancias: quién tiene fracciones, cuánto le toca a cada uno y el envío en UNA sola transacción.
// Lo usa el panel de la fiduciaria (Fiduciaria.jsx y App.jsx).
import { Asset, BASE_FEE, Memo, Networks, Operation, TransactionBuilder } from "@stellar/stellar-sdk";

const STROOPS = 10_000_000n;
const aStroops = (texto) => {
  const [e, d = ""] = String(texto).replace(",", ".").split(".");
  return BigInt(e) * STROOPS + BigInt(d.padEnd(7, "0").slice(0, 7));
};
export const aXlm = (s) => `${s / STROOPS}.${String(s % STROOPS).padStart(7, "0")}`;

/** Lee de la red quién tiene fracciones ahora mismo y calcula la parte de cada uno (su % del total, hacia abajo). */
export async function planDeReparto(horizon, { codigo, emisor, monto }) {
  const pagina = await horizon.accounts().forAsset(new Asset(codigo, emisor)).limit(200).call();
  const tenedores = pagina.records
    .map((c) => ({ cuenta: c.id, fracciones: aStroops(c.balances.find((b) => b.asset_code === codigo && b.asset_issuer === emisor)?.balance ?? "0") }))
    .filter((t) => t.fracciones > 0n);
  const total = tenedores.reduce((s, t) => s + t.fracciones, 0n);
  if (total === 0n) throw new Error(`Nadie tiene fracciones de ${codigo}.`);
  const montoStroops = aStroops(monto);
  const pagos = tenedores
    .map((t) => ({ ...t, parte: (montoStroops * t.fracciones) / total }))
    .filter((p) => p.parte > 0n);
  const repartido = pagos.reduce((s, p) => s + p.parte, 0n);
  return { pagos, total, montoStroops, repartido };
}

/**
 * Todos los pagos juntos, en UNA transacción de la fiduciaria, con la nota "REPARTO <codigo>". Devuelve el hash.
 * `firmar(xdr)` recibe la transacción sin firmar y devuelve `{ signedTxXdr }`: en la app firma Varial
 * (la llave nunca sale de la extensión).
 */
export async function enviarReparto(horizon, { desde, codigo, pagos, firmar }) {
  const cuenta = await horizon.loadAccount(desde);
  const constructor = new TransactionBuilder(cuenta, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET });
  for (const p of pagos) constructor.addOperation(Operation.payment({ destination: p.cuenta, asset: Asset.native(), amount: aXlm(p.parte) }));
  const tx = constructor.addMemo(Memo.text(`REPARTO ${codigo}`)).setTimeout(180).build();
  const { signedTxXdr } = await firmar(tx.toXDR(), { networkPassphrase: Networks.TESTNET, address: desde });
  const firmada = TransactionBuilder.fromXDR(signedTxXdr, Networks.TESTNET);
  const res = await horizon.submitTransaction(firmada);
  return res.hash;
}

/** ¿La fiduciaria ya hizo el reparto de esta ronda? Busca un pago suyo con la nota «REPARTO <codigo>». */
export async function repartoHecho(horizon, fiduciaria, codigo) {
  const pagina = await horizon.transactions().forAccount(fiduciaria).order("desc").limit(200).call();
  return pagina.records.some((t) => t.successful && t.memo === `REPARTO ${codigo}`);
}
