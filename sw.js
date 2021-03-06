const activeCache = 'currency-converter-v1';

self.addEventListener('install', event => {
  const toCache = [
    '/',
    '/assets/css/style.css',
    '/assets/css/materialize.min.css',
    '/main.js',
    'https://fonts.googleapis.com/icon?family=Material+Icons',
    'https://fonts.googleapis.com/css?family=Oswald',
    'https://cdnjs.cloudflare.com/ajax/libs/animate.css/3.5.2/animate.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0-rc.2/js/materialize.min.js',
    'https://cdn.jsdelivr.net/npm/idb@2.1.3/lib/idb.min.js',
    'https://free.currencyconverterapi.com/api/v5/countries'
  ];

  event.waitUntil(
    // Cache the values
    caches
      .open(activeCache)
      .then(cache => {
        return cache.addAll(toCache);
      })
      .catch(err => {
        console.log(err);
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names => {
      return Promise.all(
        names
          .filter(name => name !== activeCache)
          .map(name => caches.delete(name))
      );
    })
  );
});

self.addEventListener('fetch', event => {
  // Respond with cached responses if any
  event.respondWith(
    // If there's a response in the cache else Return response
    caches.match(event.request).then(res => {
      if (res) return res;

      return fetch(event.request).then(response => {
        const clone = response.clone();

        if (response.ok || response.type === 'opaque') {
          // Cache the response if the url begins with country flags
          if (event.request.url.startsWith('http://www.countryflags.io/')) {
            caches.open(activeCache).then(cache => {
              cache.put(event.request, clone);
            });
          }
        }

        // Return the response
        return response;
      });
    })
  );
});
