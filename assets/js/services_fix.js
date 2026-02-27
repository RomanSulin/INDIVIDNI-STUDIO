/* Services fixes: safe overrides without touching TV/hero code */

/* Make sure brand text is visible everywhere */
nav .nav-brand{
  display:inline-block !important;
  visibility:visible !important;
  opacity:1 !important;
}
nav .nav-by{
  color:#000 !important; /* studio in menu should be black */
}

/* CATALOG: center top texts only on catalog page */
.services-page .services-hero__inner{
  max-width: 980px;
  margin: 0 auto;
  text-align: center;
}

/* DETAIL: keep content left as originally */
.service-detail .service-hero__content{
  text-align: left;
  align-items: flex-start;
}

/* DETAIL: remove title shadows/background (requested) */
.service-detail .service-hero__title{
  text-shadow: none !important;
  background: transparent !important;
  box-shadow: none !important;
  filter: none !important;
}

/* DETAIL: video always fits viewport height */
.service-detail .service-hero{
  position: relative;
  min-height: 100svh;
  height: 100svh;
  overflow: hidden;
}
.service-detail .service-hero__video{
  position:absolute;
  inset:0;
  width:100%;
  height:100%;
  object-fit: cover;
}
.service-detail .service-hero__content{
  position: absolute;
  left: clamp(16px, 4vw, 64px);
  /* lift content so it never falls below fold */
  /* lifted higher so text+button never go below fold */
  bottom: max(120px, env(safe-area-inset-bottom));
max-width: min(720px, calc(100% - 32px));
  padding-bottom: 8px;
  z-index: 3;
}
.service-detail .service-hero__actions{
  margin-top: 14px;
}

/* Prevent accidental clipping of button/text */
.service-detail .service-hero__content > *{
  max-width: 100%;
}

/* DETAIL: mobile tweaks — lift content a bit more and remove extra shadows */
@media (max-width: 768px){
  .service-detail .service-hero__content{
    left: 16px;
    right: 16px;
    max-width: none;
    bottom: max(56px, env(safe-area-inset-bottom));
  }
  .service-detail .service-hero__desc,
  .service-detail .service-hero__btn{
    text-shadow: none !important;
    box-shadow: none !important;
    filter: none !important;
  }
}

/* Catalog card media: show something even before first frame */
.services-page .scard__media{
  background: radial-gradient(1200px 700px at 30% 20%, rgba(255,255,255,0.10), rgba(255,255,255,0.03) 45%, rgba(0,0,0,0.0) 75%);
}

/* CATALOG: mobile grid — 2 cards per row */
@media (max-width: 768px){
  .services-page .services-catalog__grid{
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 12px !important;
  }
  .services-page .scard__text{
    padding: 10px 10px 12px;
  }
  .services-page .scard__desc{
    display: none; /* keep it clean on mobile */
  }
}
