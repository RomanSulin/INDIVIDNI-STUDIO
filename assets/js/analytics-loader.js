(function (window, document) {
  "use strict";

  var config = window.__ANALYTICS__ || {};

  function normalize(value) {
    return String(value || "").trim();
  }

  function isPlaceholder(value) {
    if (!value) return true;
    var v = normalize(value).toUpperCase();
    return (
      v === "" ||
      v === "0" ||
      /^0+$/.test(v) ||
      v.indexOf("XXXX") !== -1 ||
      v.indexOf("REPLACE") !== -1 ||
      v.indexOf("YOUR") !== -1
    );
  }

  function loadScript(src, attrs) {
    if (!src || document.querySelector('script[src="' + src + '"]')) return;
    var s = document.createElement("script");
    s.src = src;
    s.async = true;
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        s.setAttribute(key, attrs[key]);
      });
    }
    document.head.appendChild(s);
  }

  function log() {
    if (!config.debug || !window.console) return;
    window.console.log.apply(window.console, arguments);
  }

  function initGA4(measurementId) {
    if (isPlaceholder(measurementId)) {
      log("[analytics] GA4 skipped: placeholder ID");
      return;
    }
    var id = normalize(measurementId);

    window.dataLayer = window.dataLayer || [];
    window.gtag =
      window.gtag ||
      function () {
        window.dataLayer.push(arguments);
      };

    window.gtag("js", new Date());
    window.gtag("config", id, {
      anonymize_ip: true,
      transport_type: "beacon"
    });

    loadScript(
      "https://www.googletagmanager.com/gtag/js?id=" +
        encodeURIComponent(id),
      { "data-analytics": "ga4" }
    );

    log("[analytics] GA4 enabled:", id);
  }

  function initYandexMetrika(counterId) {
    if (isPlaceholder(counterId)) {
      log("[analytics] Yandex Metrika skipped: placeholder ID");
      return;
    }
    var id = Number(normalize(counterId));
    if (!id || !Number.isFinite(id)) {
      log("[analytics] Yandex Metrika skipped: invalid ID");
      return;
    }

    (function (m, e, t, r, i, k, a) {
      m[i] =
        m[i] ||
        function () {
          (m[i].a = m[i].a || []).push(arguments);
        };
      m[i].l = 1 * new Date();
      for (var j = 0; j < document.scripts.length; j += 1) {
        if (document.scripts[j].src === r) return;
      }
      k = e.createElement(t);
      a = e.getElementsByTagName(t)[0];
      k.async = 1;
      k.src = r;
      a.parentNode.insertBefore(k, a);
    })(window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

    window.ym(id, "init", {
      clickmap: true,
      trackLinks: true,
      accurateTrackBounce: true,
      webvisor: true
    });

    log("[analytics] Yandex Metrika enabled:", id);
  }

  function initGTM(gtmId) {
    if (isPlaceholder(gtmId)) {
      log("[analytics] GTM skipped: placeholder ID");
      return;
    }
    var id = normalize(gtmId);
    if (!/^GTM-[A-Z0-9]+$/i.test(id)) {
      log("[analytics] GTM skipped: invalid ID format");
      return;
    }

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      "gtm.start": new Date().getTime(),
      event: "gtm.js"
    });

    loadScript(
      "https://www.googletagmanager.com/gtm.js?id=" + encodeURIComponent(id),
      { "data-analytics": "gtm" }
    );

    log("[analytics] GTM enabled:", id);
  }

  initGA4(config.ga4MeasurementId);
  initYandexMetrika(config.yandexMetrikaId);
  initGTM(config.gtmId);
})(window, document);
