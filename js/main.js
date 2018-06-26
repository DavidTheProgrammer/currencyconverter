/**
 * This is the main class of the application. It holds the state and all
 */
class CurrencyConverter {
  constructor() {
    this.countries = []; // Holds the countries and their details
  }

  /**
   * Flag an error when loading fails
   */
  errorLoadingCountries() {
    M.toast({
      html: `
      <span class="toast__message">Could not load currencies. Please reload the page</span>
      <i class="material-icons">error</i>
      `,
      classes: 'toast__error'
    });

    const selects = document.querySelectorAll('select');

    // Change the message from loading to Error
    selects.forEach(node => {
      const child = node.firstElementChild;
      child.textContent = 'Error...';
    });

    // Re init the selects
    M.FormSelect.init(selects);
  }

  /**
   * Build the currency selection list.
   */
  buildSelectOptions() {
    const selects = document.querySelectorAll('select');

    // Create the option elements
    const optionElements = [];

    // For each country build a node
    this.countries.forEach(country => {
      const element = document.createElement('option');
      const textNode = document.createTextNode(
        `${country['name']} - ${country['currencyId']}`
      );

      element.appendChild(textNode);
      element.setAttribute('value', country['currencyId']);
      element.setAttribute('data-icon', getFlagUrl(country['id']));
      element.className = 'right';

      // push to the option elements
      optionElements.push(element);
    });

    // For each node append all the option elements
    selects.forEach((node, index) => {
      optionElements.forEach(element => {
        if (index === 0) {
          node.appendChild(element);
        } else {
          node.appendChild(element.cloneNode(true));
        }
      });

      // Remove the disabled attribute
      node.removeAttribute('disabled');
      // Remove the loading options
      node.removeChild(node.firstElementChild);

      // Tie the active node to the element that's being iterated over
      const activeNode = node.children[index];

      activeNode.setAttribute('selected', true);
    });

    // Reinitialise the dropdowns after appending countries
    M.FormSelect.init(selects);
  }

  /**
   * Returns an array of countries sorted by name.
   * @param {*} serverRes - The raw response from the server
   */
  sortCountriesByName(serverRes) {
    const countries = [];
    const res = serverRes['results'];

    for (const key in res) {
      if (res.hasOwnProperty(key)) {
        const country = res[key];
        countries.push(country);
      }
    }

    return countries.sort((a, b) => {
      return a['name'] < b['name'] ? -1 : a['name'] > b['name'] ? 1 : 0;
    });
  }

  /**
   * Set event listerners for the form and other elements
   */
  setEventListeners() {}
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
    return fetch(`${this._BASE_URL}/countries`)
      .then(res => {
        if (!res.ok) {
          throw Error(res.statusText);
        }

        return res;
      })
      .then(res => res.json());
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
  return `http://www.countryflags.io/${code.toLowerCase()}/flat/32.png`;
}

// ======================================================================//
// Main Code
// ======================================================================//

/**
 * This function runs the initialisation logic. It's also the main 'entry point' of the application
 */
function init() {
  const cc = new CurrencyConverter();
  const xChange = new Xchange();

  document.addEventListener('DOMContentLoaded', () => {
    // Initialise the selectors on document ready with the "Loading options"
    const elems = document.querySelectorAll('select');
    M.FormSelect.init(elems);

    // Request for the countries
    xChange
      .getCountries()
      .then(res => {
        cc.countries = cc.sortCountriesByName(res);
        cc.buildSelectOptions();
      })
      .catch(err => {
        cc.errorLoadingCountries();
        console.log(err);
      });

    // Set event listeners
    cc.setEventListeners();
  });
}

// Call Init;
init();
