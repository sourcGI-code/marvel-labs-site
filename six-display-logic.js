// Pure calculations shared with local verification. No revenue is assumed for unsold inventory.
export function calculateEarnings({produced,sold,rate,expenses}){
 const clamp=(v,max)=>Math.max(0,Math.min(max,Number(v)||0));
 produced=Math.floor(clamp(produced,1000));sold=Math.min(produced,Math.floor(clamp(sold,1000)));rate=clamp(rate,10000);expenses=clamp(expenses,100000);
 const gross=Math.round(sold*rate*100)/100;return {produced,sold,rate,expenses,gross,net:Math.round((gross-expenses)*100)/100,unsold:produced-sold};
}
export function pilotEmail({trailer,loadout,zip}){
 if(!['16','20'].includes(String(trailer))||!loadout||!/^\d{5}$/.test(zip))throw new Error('Choose a trailer, loadout and five-digit ZIP code.');
 const subject=`Founding Operator Pilot — ${trailer} ft trailer`;
 const body=`Hello Marvel Labs,\n\nI would like to discuss the Founding Operator Pilot.\n\nTrailer: ${trailer} ft\nCurrent mower loadout: ${loadout}\nRoute ZIP code: ${zip}\n\nMy name / company:\nMy equipment details:\n\nPlease send me the pilot availability, configuration and proposed terms.\n`;
 return `mailto:hello@marvellabs.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
export const reelViews={
 arrival:{default:'all',all:[[0,10]],source:'arrival'},
 bay:{default:'all',all:[[0,20]],source:'cargo'},
 route:{default:'day',day:[[0,10.24],[37.12,46.08]],vision:[[10.24,21.76]],rtk:[[21.76,29.44]],quote:[[29.44,37.12]],source:'field'},
};
