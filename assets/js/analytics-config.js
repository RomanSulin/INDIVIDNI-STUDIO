window.__ANALYTICS__ = {
  // Google Analytics 4 (пример: G-AB12CDE34F)
  ga4MeasurementId: "G-XXXXXXXXXX",

  // Яндекс.Метрика (числовой ID счетчика, пример: 12345678)
  yandexMetrikaId: "108486659",
  yandexMetrikaOptions: {
    ssr: true,
    webvisor: true,
    clickmap: true,
    ecommerce: "dataLayer",
    referrer: document.referrer,
    url: location.href,
    accurateTrackBounce: true,
    trackLinks: true
  },

  // Опционально: Google Tag Manager (пример: GTM-ABC1234)
  gtmId: "",

  // Переключатель отладки
  debug: false
};
