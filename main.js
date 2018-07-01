/**
 * This is the main class of the application. It holds the state and all
 */
class CurrencyConverter {
  /**
   * Initialisation instructions
   * @param {LocalDb} localDb The index db class
   */
  constructor(localDb) {
    this.localDb = localDb; // The local db instance
    this.countries = []; // Holds the countries and their details
    this.recentConversions = []; // Stores the 5 most recent conversions
    this.networkState = 'online'; // The offline state of the application
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

    const $selects = document.querySelectorAll('select');

    // Change the message from loading to Error
    $selects.forEach($node => {
      const $child = $node.firstElementChild;
      $child.textContent = 'Error...';
    });

    // Re init the selects
    M.FormSelect.init($selects);
  }

  /**
   * Build the currency selection list.
   */
  buildSelectOptions() {
    const $selects = document.querySelectorAll('select');

    // Create the option elements
    const optionElements = [];

    // For each country build a node
    this.countries.forEach(country => {
      const $element = document.createElement('option');
      const $textNode = document.createTextNode(
        `${country['name']} - ${country['currencyId']}`
      );

      $element.appendChild($textNode);
      $element.setAttribute('value', country['currencyId']);
      $element.setAttribute('data-icon', getFlagUrl(country['id']));
      $element.className = 'right';

      // push to the option elements
      optionElements.push($element);
    });

    // For each node append all the option elements
    $selects.forEach(($node, index) => {
      optionElements.forEach($element => {
        if (index === 0) {
          $node.appendChild($element);
        } else {
          $node.appendChild($element.cloneNode(true));
        }
      });

      // Remove the disabled attribute
      $node.removeAttribute('disabled');
      // Change the loading options to "Select Currency" and disable them
      const $loading = $node.firstElementChild;
      $loading.textContent = 'Select currency';
      $loading.setAttribute('disabled', true);
      $loading.setAttribute('value', 'none');
    });

    // Reinitialise the dropdowns after appending countries
    M.FormSelect.init($selects);
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
  setEventListeners() {
    // Class
    const xChange = new Xchange();

    // Elements
    const $form = document.getElementById('form');
    const $amount = document.getElementById('amount');
    const $from = document.getElementById('from');
    const $to = document.getElementById('to');

    // HTML Collection of options
    const $fromOptions = $from.children;
    const $toOptions = $to.children;

    // Listen for changes in online state of the application
    window.addEventListener('online', () => this._updateOnlineStatus());
    window.addEventListener('offline', () => this._updateOnlineStatus());

    // Amount input
    $amount.addEventListener('input', event => {
      const amountValue = event.target.value;
      const fromValue = $from.options[from.selectedIndex].value;
      const toValue = $to.options[to.selectedIndex].value;

      this._toggleSubmitButton(amountValue, fromValue, toValue);
    });

    // From input
    $from.addEventListener('change', event => {
      const fromValue = event.target.value;
      const amountValue = $amount.value;
      const toValue = $to.options[to.selectedIndex].value;

      // Enable / Disable the submit button
      this._toggleSubmitButton(amountValue, fromValue, toValue);

      // Disable the selected option so you can't change from and to the same currency
      for (let i = 1; i < $toOptions.length; i++) {
        // We start at index 1, ignoring the original
        const $option = $toOptions[i];

        if ($option.value === fromValue) {
          $option.setAttribute('disabled', true);
        } else {
          $option.removeAttribute('disabled');
        }
      }

      // Re initialise the selection
      M.FormSelect.init($to); // Performance issue?. Suspect it's the source of the screen jitter bug
    });

    // To input
    $to.addEventListener('change', event => {
      const toValue = event.target.value;
      const amountValue = $amount.value;
      const fromValue = $from.options[$from.selectedIndex].value;

      this._toggleSubmitButton(amountValue, fromValue, toValue);

      // Disable selected option on from selection to avoid changing to same currency
      for (let i = 1; i < $fromOptions.length; i++) {
        // We start at index 1, ignoring the original
        const $option = $fromOptions[i];

        if ($option.value === toValue) {
          $option.setAttribute('disabled', true);
        } else {
          $option.removeAttribute('disabled');
        }
      }

      // Re initialise the selection
      M.FormSelect.init($from);
    });

    // Form submission
    $form.addEventListener('submit', event => {
      // Prevent default actions
      event.preventDefault();

      // open the modal
      const modal = document.getElementById('conversion-modal');
      const modalInstance = M.Modal.init(modal, {
        onCloseStart: () => this._resetForm(),
        onCloseEnd: () => {
          this._resetModalClasses();
          this._updateRecentConversions();
        }
      });
      modalInstance.open();

      const amount = $amount.value;
      const fromValue = $from.options[$from.selectedIndex].value;
      const toValue = $to.options[$to.selectedIndex].value;

      xChange
        .getRate(fromValue, toValue)
        .then(res => {
          const key = `${fromValue}_${toValue}`;
          const rate = res[key];
          this._showConversion(amount, fromValue, toValue, rate, modalInstance);
          this._addToRecent(key, rate, amount);
        })
        .catch(err => {
          this._errorConverting(modalInstance);
        });
    });
  }

  /**
   * Initiate the recent conversions
   */
  async initRecentConversions() {
    try {
      // Clean up the db
      await this.localDb.cleanUp('recent', 5, 'by-date');

      // Get the 5 most recent coverserions
      const results = await this.localDb.getAllItems('recent', 'by-date');

      this.recentConversions = results;

      // Build the recent conversions
      if (results.length > 0) {
        const $aside = document.getElementById('aside-content');
        const $placeholder = document.getElementById('aside-placeholder');

        // Remove the placeholder
        $aside.removeChild($placeholder);

        // for each conversion build an html element and add it to the DOM
        results.forEach(conversion => {
          // Get the values
          const from = conversion.currencies.split('_')[0];
          const to = conversion.currencies.split('_')[1];
          const amount = conversion.amount;
          const rate = conversion.rate;
          const timestamp = new Date(conversion.timestamp);

          const div = document.createElement('div');

          const html = `
            <div class="recent-conversion__from">
              ${amount} ${from} 
            </div>
    
            <i class="material-icons recent-conversion__icon">chevron_right</i>
          
            <div class="recent-conversion__to">
              ${(amount * rate).toFixed(2)} ${to}
            </div>
    
            <div class="recent-conversion__date">
              (${timestamp.toLocaleDateString()} - ${timestamp.toLocaleTimeString()})
            </div>
          `;

          // Build the class properties
          div.className = 'recent-conversion animated fadeInDown';
          div.innerHTML = html;

          // If the aside has no children append this element. Otherwise insert it after the first element
          if ($aside.firstElementChild === null) {
            $aside.appendChild(div);
          } else {
            $aside.insertBefore(div, $aside.firstElementChild);
          }
        });
      }
    } catch (err) {
      // HAndle error
      console.log(err);
    }
  }

  /**
   * Updates the recentconversions list
   */
  async _updateRecentConversions() {
    try {
      // Clean up the db and don't execute the next line until
      await this.localDb.cleanUp('recent', 5, 'by-date');

      // Get the 5 most recent coverserions
      const results = await this.localDb.getAllItems('recent', 'by-date');

      if (this.recentConversions.length > 0) {
        const lastCurrentItem = this.recentConversions[
          this.recentConversions.length - 1
        ];
        const lastDbItem = results[results.length - 1];
        // If nothing has changed. Bail
        if (
          lastCurrentItem.currencies === lastDbItem.currencies &&
          lastCurrentItem.amount === lastDbItem.amount
        )
          return;
      }

      this.recentConversions = results;

      // Capture the parent node
      const $aside = document.getElementById('aside-content');

      // The result to insert
      const toInsert = results[results.length - 1];

      const from = toInsert.currencies.split('_')[0];
      const to = toInsert.currencies.split('_')[1];
      const amount = toInsert.amount;
      const rate = toInsert.rate;
      const timestamp = new Date(toInsert.timestamp);

      const div = document.createElement('div');

      const html = `
        <div class="recent-conversion__from">
          ${amount} ${from} 
        </div>

        <i class="material-icons recent-conversion__icon">chevron_right</i>
      
        <div class="recent-conversion__to">
          ${(amount * rate).toFixed(2)} ${to}
        </div>

        <div class="recent-conversion__date">
          (${timestamp.toLocaleDateString()} - ${timestamp.toLocaleTimeString()})
        </div>
      `;

      // Build the class properties
      div.className = 'recent-conversion animated fadeInDown';
      div.innerHTML = html;

      // Query the recent conversions
      const $recentConversions = document.querySelectorAll(
        '.recent-conversion'
      );

      if ($recentConversions.length === 0) {
        const $placeholder = document.getElementById('aside-placeholder');
        $aside.removeChild($placeholder);
        $aside.appendChild(div);
      } else if ($recentConversions.length < 5) {
        const $firstChild = $aside.firstChild;
        $aside.insertBefore(div, $firstChild);
        return;
      } else {
        // Remove the last node
        const $lastChild = $aside.lastChild;
        $aside.removeChild($aside.lastChild);

        // Insert the new node at the top
        const $firstChild = $aside.firstChild;
        $aside.insertBefore(div, $firstChild);
      }
    } catch (err) {
      // HAndle error
      console.log(err);
    }
  }

  /**
   * Updates the online status of the application
   */
  _updateOnlineStatus() {
    const $warn = document.getElementById('warning');

    const online = navigator.onLine;

    $warn.className = online ? 'warning--hidden' : 'warning';
    this.networkState = online ? 'online' : 'offline';
  }

  /**
   * Toogles the submit button disabled state based on the parameters
   * @param {number} amountValue The value in the amount field
   * @param {string} fromValue The value of the from select element
   * @param {string} toValue The value of the to select element
   */
  _toggleSubmitButton(amountValue, fromValue, toValue) {
    const $submit = document.getElementById('submit-button');

    if (amountValue > 0 && fromValue !== 'none' && toValue !== 'none') {
      $submit.removeAttribute('disabled');
    } else {
      $submit.setAttribute('disabled', true);
    }
  }

  /**
   * Handles the data population and class manipulation of the modal elements
   * @param {number} amount The amount we're converting
   * @param {string} fromValue The currency we're converting from
   * @param {string} toValue The currency we're converting to
   * @param {number} rate The exchange rate
   */
  _showConversion(amount, fromValue, toValue, rate) {
    // Elements
    const $preloader = document.getElementById('preloader');
    const $data = document.getElementById('data');
    const $convertedFrom = document.getElementById('converted-from');
    const $convertedTo = document.getElementById('converted-to');
    const $rate = document.getElementById('rate');

    // Convert amount and round off to 3 dp
    const convertedAmount = (amount * rate).toFixed(2);

    // Insert the values in their respective fields
    $convertedFrom.textContent = `${amount} ${fromValue}`;
    $convertedTo.textContent = `${convertedAmount} ${toValue}`;
    $rate.textContent = `${rate}`;

    // Hide the preloader and show the data
    $preloader.className = 'modal__preloader--hidden';
    $data.className = 'modal__data--visible animated fadeIn';
  }

  /**
   * Closes the modal instance and shows an error toast message
   * @param {*} modalInstance The instance of the modal so we can close it
   */
  _errorConverting(modalInstance) {
    modalInstance.close();

    M.toast({
      html: `
      <span class="toast__message">Could not convert. Please try again</span>
      <i class="material-icons">error</i>
      `,
      classes: 'toast__error'
    });
  }

  /**
   * This resets the modal classes on close end
   */
  _resetModalClasses() {
    const $preloader = document.getElementById('preloader');
    const $data = document.getElementById('data');

    $preloader.className = 'modal__preloader';
    $data.className = 'modal__data';
  }

  /**
   * Resets the form to a blank state if the checkbox is ticked
   */
  _resetForm() {
    const $clear = document.getElementById('clear');

    if ($clear.checked) {
      const $amount = document.getElementById('amount');
      const $selects = document.querySelectorAll('select');
      const $from = $selects[0];
      const $to = $selects[1];
      const $submit = document.getElementById('submit-button');

      const $fromOptions = $from.children;
      const $toOptions = $to.children;

      // Reset the values
      $amount.value = 0;
      $from.selectedIndex = 0;
      $to.selectedIndex = 0;

      // remove the disabled attribute from the children of both selections
      for (let i = 1; i < $fromOptions.length; i++) {
        // We start at index 1, ignoring the original
        const $fromOption = $fromOptions[i];
        const $toOption = $toOptions[i];

        $fromOption.removeAttribute('disabled');
        $toOption.removeAttribute('disabled');
      }

      // Reinitialise the selections
      M.FormSelect.init($selects);

      // Deactivate submit button
      $submit.setAttribute('disabled', true);
    }
  }

  /**
   * Registers the service worker
   */
  registerServiceWorker() {
    if (navigator.serviceWorker) {
      // Register the SW
      navigator.serviceWorker.register('./sw.js');
    }
  }

  /**
   *
   * @param {string} key The key to store in the database
   * @param {number} rate The rate of the key
   * @param {number} string The amount that was converted
   */
  _addToRecent(key, rate, amount) {
    const obj = {
      currencies: key,
      rate: rate,
      amount: +amount,
      timestamp: Date.now()
    };

    // Store the item in the database
    this.localDb.addItem('recent', obj);
  }
}

/**
 * This class handles all the interactions with the database
 */
class LocalDb {
  constructor() {
    this._dbPromise = idb.open('x-change', 1, upgradeDb => {
      const oldVersion = upgradeDb.oldVersion;

      switch (oldVersion) {
        case 0:
          const recentStore = upgradeDb.createObjectStore('recent', {
            keyPath: 'currencies'
          });
          // create index
          recentStore.createIndex('by-date', 'timestamp');
      }
    });
  }

  /**
   * This function deletes all objects from a store except the newest specified number
   * @param {string} store The store to carry out the operation on
   * @param {number} numberToSave The number of items to save
   * @param {string} [index] The index to retrieve
   */
  async cleanUp(store, numberToSave, index) {
    const db = await this._dbPromise;

    const tx = db.transaction(store, 'readwrite');
    const objectStore = tx.objectStore(store);

    // Get the cursor depending on whether or not an index is provided
    const cursor = index
      ? await objectStore.index(index).openCursor(null, 'prev')
      : await objectStore.openCursor(null, 'prev');

    // If there's no cursor, bail
    if (!cursor) return;
    // Advance the cursor
    const advancedCursor = await cursor.advance(numberToSave);

    // Declare the delete function
    const deleteRest = function(cursor) {
      if (!cursor) return;

      cursor.delete();
      cursor.continue().then(deleteRest);
    };

    // Call the delete function
    deleteRest(advancedCursor);
  }

  /**
   * This method retireves items from the IDB database
   *
   * @param {string} store The store to retrieve the item from
   * @param {string} key The key of the item to retrieve
   */
  async getItem(store, key) {
    try {
      const db = await this._dbPromise;

      const tx = db.transaction(store);
      const objectStore = tx.objectStore(store);

      // Return the value
      return objectStore.get(key);
    } catch (err) {
      // Handle the error
      // console.log(err);
    }
  }

  /**
   * This method retrieves all the values in the specified store. Also allows an optional index
   * @param {string} store The name of the store to retrieve all items for
   * @param {string} [index] The optional index to query by
   */
  async getAllItems(store, index) {
    try {
      const db = await this._dbPromise;

      const tx = db.transaction(store);
      const objectStore = tx.objectStore(store);

      if (index) {
        const storeIndex = objectStore.index(index);
        return storeIndex.getAll();
      }

      return objectStore.getAll();
    } catch (err) {
      // Handle error
      console.log(err);
    }
  }

  /**
   * This adds a key value pair into the database
   * @param {string} store - The store to add the item to
   * @param {*} value - The value to insert into the database
   * @param {string} [key] - The optional key of the item to put into the
   */
  async addItem(store, value, key) {
    try {
      const db = await this._dbPromise;

      const tx = db.transaction(store, 'readwrite');
      const objectStore = tx.objectStore(store);

      if (key) {
        objectStore.put(value, key);
      } else {
        objectStore.put(value);
      }

      return tx.complete;
    } catch (err) {
      // Handle the error here
      // console.log(err);
    }
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

    return fetch(`${this._BASE_URL}/convert?q=${key}&compact=ultra`)
      .then(res => {
        if (!res.ok) {
          throw Error(res.statusText);
        }

        return res;
      })
      .then(res => res.json());
  }
}

/**
 * Retrieves the URL for a flag of a country given the alpha 2 country code
 * @param {string} code The alpha 2 country code. Default is AD
 */
function getFlagUrl(code = 'AD') {
  // This is a disaster. Forced to use a proxy that returns content at 10req/second... Once cached though, things move quick
  return `https://thingproxy.freeboard.io/fetch/http://www.countryflags.io/${code.toLowerCase()}/flat/32.png`;
}

// ======================================================================//
// Init Code
// ======================================================================//

/**
 * This function runs the initialisation logic. It's also the main 'entry point' of the application
 */
function init() {
  const db = new LocalDb();
  const xChange = new Xchange();
  const cc = new CurrencyConverter(db);

  // Other Init Logic
  document.addEventListener('DOMContentLoaded', () => {
    // Register the SW immediately
    cc.registerServiceWorker();

    // Initialise the selectors on document ready with the "Loading options"
    const $elems = document.querySelectorAll('select');
    M.FormSelect.init($elems);

    // Request for the countries
    xChange
      .getCountries()
      .then(res => {
        cc.countries = cc.sortCountriesByName(res);
        cc.buildSelectOptions();
        cc.setEventListeners();
        cc.initRecentConversions();
      })
      .catch(err => {
        cc.errorLoadingCountries();
      });
  });
}

// Call Init;
init();
