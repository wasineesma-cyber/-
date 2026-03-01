const ID_PAYLOAD_FORMAT = "000201";
const ID_MERCHANT_INFORMATION_BOT = "2937";
const ID_TRANSACTION_CURRENCY = "5303764";
const ID_COUNTRY_CODE = "5802TH";
const ID_CRC = "6304";

function formatId(id: string, value: string) {
  return `${id}${value.length.toString().padStart(2, "0")}${value}`;
}

function crc16(payload: string) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i += 1) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j += 1) {
      crc = (crc & 0x8000) !== 0 ? (crc << 1) ^ 0x1021 : crc << 1;
    }
    crc &= 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) return `66${digits.slice(1)}`;
  return digits;
}

export function createPromptPayPayload(phoneNumber: string, amount: number) {
  const phone = normalizePhone(phoneNumber);
  const merchantInfo = `${ID_MERCHANT_INFORMATION_BOT}0016A000000677010111${formatId("01", phone)}`;
  const amountField = Number.isFinite(amount) && amount > 0 ? formatId("54", amount.toFixed(2)) : "";
  const payloadNoCrc = `${ID_PAYLOAD_FORMAT}010211${merchantInfo}${ID_COUNTRY_CODE}${ID_TRANSACTION_CURRENCY}${amountField}${ID_CRC}`;
  const checksum = crc16(payloadNoCrc);
  return `${payloadNoCrc}${checksum}`;
}
