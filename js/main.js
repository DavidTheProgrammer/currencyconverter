/**
 * This is the main class of the application. It holds the state and all
 */
class CurrencyConverter {
  constructor() {
    this.countries = []; // Holds the countries and their details
    this.countriesLoaded = false; // A flag to signal the loading of the countries
    this.countryReqErr = false; // A flag to signal an error in the loading of the countries
  }
}

// ======================================================================//
// API Interactions
// ======================================================================//

/**
 * Manages the curency converter API Interactions
 */
class Xchange {
  constructor() {
    this._BASE_URL = 'https://free.currencyconverterapi.com/api/v5';
  }

  /**
   * Gets a list of countries including currency information and Country codes
   */
  getCountries() {
    return fetch(`${this._BASE_URL}/countries`).then(res => res.json());
  }

  /**
   * Returns the rate of the currency conversion
   * @param {string} from The currency to convert from
   * @param {string} to The currency to conver to
   */
  getRate(from = 'USD', to = 'ZMW') {
    const key = `${from}_${to}`;

    return fetch(`${this._BASE_URL}/convert?q=${key}&compact=ultra`).then(res =>
      res.json()
    );
  }
}

/**
 * Retrieves the URL for a flag of a country given the alpha 2 country code
 * @param {string} code The alpha 2 country code. Default is AD
 */
function getFlagUrl(code = 'AD') {
  return `http://www.countryflags.io/${code.toLowerCase()}/flat/24.png`;
}

// ======================================================================//
// Main
// ======================================================================//

/**
 * This is the entry point of the application
 */
function main() {
  init();
  setListeners();
}

/**
 * This function runs the initialisation logic
 */
function init() {
  const xChange = new Xchange();

  // Request for the countries the moment the application is started
  xChange
    .getCountries()
    .catch(err => {
      CurrencyConverter.countryReqErr = true;
      CurrencyConverter.countriesLoaded = true;
      console.log(err);
    })
    .then(res => {
      CurrencyConverter.countries = res['results'];
      CurrencyConverter.countriesLoaded = true;
    });
}

/**
 * This function sets event listeners for the application
 */
function setListeners() {
  // Initialise the selectors on document ready
  document.addEventListener('DOMContentLoaded', () => {
    const elems = document.querySelectorAll('select');
    const instances = M.FormSelect.init(elems);
  });
}

// Call the main function;
main();
