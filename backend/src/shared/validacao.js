const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function ehUuid(valor) {
  return typeof valor === 'string' && UUID.test(valor);
}

function textoAparado(valor) {
  return typeof valor === 'string' ? valor.trim() : '';
}

module.exports = { ehUuid, textoAparado };
