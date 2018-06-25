export class Xchange {
  _BASE_URL = 'https://www.currencyconverterapi.com/api/v5';

  static getCurrencies = () => {
    return fetch(`${this._BASE_URL}/currencies`);
  };

  static getRate = (from = 'USD', to = 'ZMW') => {
    const key = `${from}_${to}`;

    return fetch(`${this._BASE_URL}/convert?q=${key}&compact=ultra`);
  };
}
