const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

const menuButton = $('.menu-toggle');
const mobileNav = $('#mobile-nav');
function closeMenu() { menuButton.setAttribute('aria-expanded', 'false'); menuButton.setAttribute('aria-label', 'Open menu'); mobileNav.hidden = true; }
menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  mobileNav.hidden = !open;
});
$$('a', mobileNav).forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !mobileNav.hidden) { closeMenu(); menuButton.focus(); } });
window.matchMedia('(min-width: 761px)').addEventListener('change', event => { if (event.matches) closeMenu(); });

const stages = [
  { kicker: '01 / Intake & preprocessing', title: ['Start with', 'what’s local.'], description: 'Raw biomass is reduced and conditioned into particles suited to the production process. Control begins with the feedstock.', points: ['Size reduction and homogenization', 'Particle preparation and handling', 'Feedstock selection for the application'], image: 'grass-fiber', alt: 'Grass reduced to a consistent fibrous feedstock', caption: 'Material preparation / Grass fiber' },
  { kicker: '02 / Material formulation', title: ['The recipe', 'makes the material.'], description: 'Prepared powders, binders, and other ingredients are evaluated together. Formulation connects a local feedstock to the requirements of the finished part.', points: ['Powder and binder combinations', 'Application-specific material development', 'Controlled preparation and dosing'], image: 'formulation', alt: 'Material powders and binder samples arranged for formulation development', caption: 'Material development / Powder & binder evaluation' },
  { kicker: '03 / Digital forming', title: ['Give the material', 'a new form.'], description: 'Digital geometry guides the production process. Binder jetting and molding provide different routes from prepared material to a physical part.', points: ['Geometry defined in the digital model', 'Process selection based on application', 'Complex shapes and integrated features'], image: 'printer', alt: 'Industrial binder jet manufacturing equipment in the tooling portfolio', caption: 'Manufacturing portfolio / Binder jet equipment' },
  { kicker: '04 / Finishing & quality', title: ['Finish for', 'the real world.'], description: 'Coating, infiltration, and assembly determine how a part looks and performs. Inspection and material testing establish whether it meets the application’s requirements.', points: ['Coating and surface treatment', 'Dimensional and material verification', 'Qualification for the intended use'], image: 'components', alt: 'A coordinated set of finished lighting components', caption: 'Finished components / Lighting application' }
];
let currentStage = 0;
const tabs = $$('[data-step]');
function setStage(index, moveFocus = false) {
  currentStage = (index + stages.length) % stages.length;
  const stage = stages[currentStage];
  tabs.forEach((tab, i) => { tab.setAttribute('aria-selected', String(i === currentStage)); tab.tabIndex = i === currentStage ? 0 : -1; });
  $('#process-panel').setAttribute('aria-labelledby', `step-tab-${currentStage}`);
  $('#process-kicker').textContent = stage.kicker;
  const title = $('#process-title');
  title.replaceChildren(document.createTextNode(stage.title[0]), document.createElement('br'), document.createTextNode(stage.title[1]));
  $('#process-description').textContent = stage.description;
  $('#process-points').replaceChildren(...stage.points.map(point => { const li = document.createElement('li'); li.textContent = point; return li; }));
  const img = $('#process-image'); img.src = `assets/${stage.image}.webp`; img.alt = stage.alt;
  $('#process-caption').textContent = stage.caption;
  if (moveFocus) tabs[currentStage].focus();
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => setStage(index));
  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight') next = index + 1;
    if (event.key === 'ArrowLeft') next = index - 1;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = stages.length - 1;
    if (next !== undefined) { event.preventDefault(); setStage(next, true); }
  });
});
$('#next-step').addEventListener('click', () => setStage(currentStage + 1));

const projectData = {
  sink: { title: 'Sculptural sinks & basins', category: 'Bath & home / Product demonstration', image: 'sinks-studio', alt: 'Two ribbed sculptural sink basins', description: 'A familiar product makes the feedstock-to-product idea tangible. The portfolio shows basin geometry, integrated drain details, and a range of textures and coatings.', points: ['Large consumer-scale forms', 'Ribbed and smooth surface treatments', 'Coating development for the target use'], note: 'Selected imagery from the biomass portfolio. The featured bathroom design and photograph on this site are courtesy of Sandhelden. Product suitability requires application-specific testing.' },
  guitar: { title: 'A lattice guitar body', category: 'Consumer products / Geometry demonstration', image: 'guitar', alt: 'Open lattice geometry in a full-size guitar body', description: 'An intricate guitar body demonstrates how digital production can combine structural geometry and visual identity within one object.', points: ['Full-size product geometry', 'Integrated internal and external lattice', 'Complex shapes without conventional hard tooling'], note: 'Portfolio demonstration. Specific material properties and instrument performance are not established by the image.' },
  tooling: { title: 'Direct & forming tools', category: 'Advanced tooling / Reference applications', image: 'tooling', alt: 'A printed forming tool and shaped component', description: 'Sand-printed tooling offers a route to large composite molds, vacuum-forming tools, and fixtures. The portfolio describes reusable tools with different temperature formulations and surface finishes.', points: ['Direct composite layup tooling', 'Solid, vented, or porous forming tools', 'Trim, jig, and assembly fixtures'], note: 'Reference examples include AMClad applications. The portfolio reports different properties across formulations and test dates. Confirm the specific material system and complete qualification for each project.' },
  lighting: { title: 'Sculptural lighting', category: 'Lighting / Product demonstration', image: 'lighting', alt: 'Three organic pendant lights with openings in their curved shells', description: 'Organic shells and integrated openings give light a physical structure. The portfolio extends from sculptural pendants to coordinated housings, trim, and mounting components.', points: ['Organic pendant forms', 'Integrated openings and cavities', 'Coordinated component families'], note: 'Portfolio design examples. Performance, coatings, electrical integration, and end-use compliance depend on the selected application.' },
  washout: { title: 'Sacrificial washout tooling', category: 'Composite tooling / Reference application', image: 'washout', alt: 'Hollow composite sections with round and rectangular profiles', description: 'A sacrificial sand or ceramic-sand mandrel supports a hollow composite during layup and processing. Afterward, water removes the core to release trapped internal geometry.', points: ['Digital design and binder-jet mandrel production', 'Barrier coating followed by composite layup', 'Water removal after the composite process'], note: 'Reference application from the advanced tooling portfolio. Select media, barrier coating, and process conditions together. Formulation and temperature limits require project-specific verification.' },
  hardware: { title: 'Architectural hardware', category: 'Architecture / Surface demonstration', image: 'hardware', alt: 'Architectural hardware with a reflective copper finish', description: 'A single geometry can take on different appearances through coating and metallization. These examples show the transition from particulate material to finished architectural details.', points: ['Digitally defined mounting geometry', 'Coated and metallized finishes', 'Custom forms and surface character'], note: 'Image from the supplied product portfolio. Final appearance and properties vary with print media, binder, and finishing process.' },
  restoration: { title: 'Digital architectural restoration', category: 'Architecture / Reference workflow', image: 'restoration', alt: 'A digitally reproduced classical architectural capital', description: 'Digital capture creates a production starting point from an existing object. The portfolio documents a wooden capital restoration at Allegheny College, using scanning, CAD enhancement, and an AMClad reproduction.', points: ['Capture the original geometry', 'Repair and refine the digital model', 'Reproduce complex details in low quantities'], note: 'Reference application documented in the advanced tooling portfolio. This example illustrates the scan-to-reproduction workflow.' },
  planters: { title: 'Vessels & branded goods', category: 'Home & lifestyle / Product demonstration', image: 'planters', alt: 'Finished dark planters with branding and plants', description: 'Repeatable vessels show how raw texture, color, and embossed branding can become a finished product family. Finishing and assembly adapt the same underlying approach to different uses.', points: ['Embossed or recessed branding', 'Raw, painted, and gloss-coated options', 'Product assembly and functional details'], note: 'Image from the supplied product portfolio. Finishes and end-use suitability depend on the material and application.' }
};
const projects = $$('.project');
$$('[data-filter]').forEach(button => button.addEventListener('click', () => {
  $$('[data-filter]').forEach(filter => { const active = filter === button; filter.classList.toggle('active', active); filter.setAttribute('aria-pressed', String(active)); });
  let count = 0;
  projects.forEach(project => { const visible = button.dataset.filter === 'all' || project.dataset.category === button.dataset.filter; project.hidden = !visible; if (visible) count++; });
  $('#portfolio-count').textContent = `${String(count).padStart(2, '0')} selected examples`;
}));
const dialog = $('#project-dialog');
let opener;
projects.forEach(project => project.addEventListener('click', () => {
  const data = projectData[project.dataset.project];
  opener = project;
  $('#dialog-title').textContent = data.title;
  $('#dialog-category').textContent = data.category;
  $('#dialog-description').textContent = data.description;
  $('#dialog-note').textContent = data.note;
  $('#dialog-image').src = `assets/${data.image}.webp`;
  $('#dialog-image').alt = data.alt;
  $('#dialog-points').replaceChildren(...data.points.map(point => { const li = document.createElement('li'); li.textContent = point; return li; }));
  $('#dialog-contact').href = `mailto:hello@marvellabs.com?subject=${encodeURIComponent('Application inquiry: ' + data.title)}`;
  dialog.showModal(); dialog.scrollTop = 0; document.body.classList.add('dialog-open'); $('.dialog-close').focus();
}));
$('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const bounds = dialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
});
dialog.addEventListener('close', () => { document.body.classList.remove('dialog-open'); opener?.focus(); });
$('#year').textContent = new Date().getFullYear();
