// Keep scroll scrubbing, native playback and chapter-specific title editing
// on the same delivery timeline. The final interval holds the finished fleet.
export const DELIVERY_SPAN=1650/2600;
export const DELIVERY_END=.25+DELIVERY_SPAN;
export const DELIVERY_TITLE_START=.25+DELIVERY_SPAN*(15/18);
export const cargoProgress=p=>Math.max(0,Math.min(1,(p-.25)/DELIVERY_SPAN));
