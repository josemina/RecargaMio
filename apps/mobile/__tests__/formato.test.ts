// T9 · Formato de pesos y del número de la tarjeta.
import { numeroOculto, pesos, pesosHablados } from '@/utilidades/formato';

describe('T9 · Formato', () => {
  it.each([
    [12400, '$12.400'],
    [3500, '$3.500'],
    [100000, '$100.000'],
    [0, '$0'],
    [-300, '-$300'],
    [1234567, '$1.234.567'],
  ])('pesos(%d) → %s', (valor, esperado) => expect(pesos(valor)).toBe(esperado));

  it('el lector de pantalla oye «pesos» y no «dólares»', () => {
    expect(pesosHablados(12400)).toBe('12.400 pesos');
  });

  it('el número de la tarjeta siempre va oculto, solo con los últimos 4 dígitos', () => {
    expect(numeroOculto('4821')).toBe('MIO •••• 4821');
  });
});
