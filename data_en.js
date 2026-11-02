/* ============ MEDIA ============
   src: direct image file URL (static.wikia.nocookie.net/...) or local path. Empty = placeholder.
   fit: cover | contain; position: object-position. type: image (later: video + poster). */
const M = (code, need, sourcePage, extra = {}) => ({
  code, need, sourcePage, src: "", originalImageUrl: "", alt: need, fit: "cover", position: "50% 50%", type: "image", ...extra
});
const MEDIA = {
  "BG-01": M("BG-01", "The Oldest House exterior, looking up", "https://control.fandom.com/wiki/Oldest_House#Gallery"),
  "BG-02": M("BG-02", "Central Executive, wide view of the office levels", "https://control.fandom.com/wiki/Executive_Sector"),
  "EX-01": M("EX-01", "Ahti the Janitor, first meeting in the corridor", "https://control.fandom.com/wiki/Ahti#Gallery"),
  "EX-02": M("EX-02", "The Service Weapon in Jesse's hand or close-up", "https://control.fandom.com/wiki/Service_Weapon#Gallery"),
  "EX-03": M("EX-03", "Hiss-possessed staff floating in red light", "https://control.fandom.com/wiki/The_Hiss#Gallery"),
  "EX-04": M("EX-04", "The 8-inch Floppy Disk from the game", "https://control.fandom.com/wiki/Floppy_Disk#Gallery", { fit: "contain" }),
  "EX-05": M("EX-05", "The red Hotline phone", "https://control.fandom.com/wiki/Hotline#Gallery", { fit: "contain" }),
  "BG-03": M("BG-03", "NSC Power Plant and surrounding walkways, wide", "https://control.fandom.com/wiki/NSC_Power_Plant"),
  "MA-01": M("MA-01", "NSC Power Plant with a figure for scale", "https://control.fandom.com/wiki/NSC_Power_Plant"),
  "MA-02": M("MA-02", "The Clog in a tunnel, glowing nodes", "https://control.fandom.com/wiki/Clog#Gallery"),
  "MA-03": M("MA-03", "The Merry-Go-Round Horse on its pole", "https://control.fandom.com/wiki/Merry-Go-Round_Horse#Gallery", { fit: "contain" }),
  "MA-04": M("MA-04", "Black Rock Quarry, rock pillars and alien sky", "https://control.fandom.com/wiki/Quarry_Threshold"),
  "BG-04": M("BG-04", "Central Research with trees and concrete levels", "https://control.fandom.com/wiki/Research_Sector"),
  "RE-01": M("RE-01", "Dr. Darling in a research presentation", "https://control.fandom.com/wiki/Casper_Darling"),
  "RE-02": M("RE-02", "HRA worn on an agent's chest", "https://control.fandom.com/wiki/Hedron_Resonance_Amplifier"),
  "RE-03": M("RE-03", "The Slide Projector, close-up", "https://control.fandom.com/wiki/Slide_Projector#Gallery", { fit: "contain" }),
  "RE-04": M("RE-04", "Hedron's chamber and containment structure", "https://control.fandom.com/wiki/Hedron"),
  "BG-05": M("BG-05", "The Panopticon: tiers of cells and bridges", "https://control.fandom.com/wiki/Containment_Sector"),
  "CO-01": M("CO-01", "Rows of cells or an item behind glass", "https://control.fandom.com/wiki/Panopticon"),
  "CO-02": M("CO-02", "The Benicoff TV", "https://control.fandom.com/wiki/Benicoff_TV#Gallery", { fit: "contain" }),
  "CO-03": M("CO-03", "The fridge in its cell, with the agent watching", "https://control.fandom.com/wiki/Fridge_Duty"),
  "CO-04": M("CO-04", "Prime Candidate Program area, P6/P7 markings", "https://control.fandom.com/wiki/Prime_Candidate_Program"),
  "BG-06": M("BG-06", "White void, platforms, black pyramid", "https://control.fandom.com/wiki/Astral_Plane#Gallery"),
  "AS-01": M("AS-01", "Jesse on Astral Plane platforms", "https://control.fandom.com/wiki/Astral_Plane#Gallery"),
  "AS-02": M("AS-02", "The inverted black pyramid in the white void", "https://control.fandom.com/wiki/Astral_Plane#Gallery")
};

/* ============ CONTENT ============ */
const UI = {
  title: "THE OLDEST HOUSE",
  subtitle: "Inside the world of Control",
  spoiler: "Contains story spoilers for Control.",
  hint: "Scroll to explore the House",
  footer: "An independent fan project about the world of Control. Not the official site of the game. Control is a game by Remedy Entertainment.",
  officialUrl: "https://www.remedygames.com/games/control",
  noImage: "no image",
  sourcesLabel: "Sources and images",
  imagesCredit: "Images: Control Wiki (Fandom), © Remedy Entertainment",
  menu: "Menu", close: "Close ✕", open: "Open image: ", prev: "Previous image", next: "Next image", navLabel: "Sections"
};
const HOME = {
  id: "home", nav: "House", bg: "BG-01",
  heading: "Outside, a building. Inside, different rules.",
  text: "In New York stands a concrete high-rise that is easy to overlook. It houses the Federal Bureau of Control, an agency that studies the impossible. Yet even its own staff don't know where the building they work in ends.",
  button: "Enter the House",
  extra: "Headquarters of the Federal Bureau of Control"
};
const SECTORS = [
  { id: "executive", nav: "Executive", no: "02", en: "Executive Sector", bg: "BG-02",
    heading: "The Bureau is closed. You're already inside.",
    text: "Offices, meeting rooms and service corridors. This is where Jesse Faden starts looking for answers, and finds that the Bureau no longer has a Director, and the building no longer has any safe rules.",
    items: [
      { media: ["EX-01"], title: "He knows where you need to go", label: "Ahti, the first to greet you",
        text: "The first person Jesse meets is Ahti, the Janitor. He takes her for his new assistant and sends her on her way, as if her arrival were part of an ordinary working day. While the Bureau tries to explain how the House works, Ahti simply keeps working, and seems to understand the place better than anyone.",
        caption: "AHTI / Janitor of the Oldest House" },
      { media: ["EX-02"], title: "A position you can't simply take", label: "The Director's Office and the Service Weapon",
        text: "In Director Zachariah Trench's office, Jesse finds the Service Weapon. This Object of Power doesn't just fire: through it, the Board chooses the Director of the Bureau. After a trial in the Astral Plane, the weapon accepts its new owner. Jesse came looking for her brother, and suddenly finds herself responsible for the entire House.",
        caption: "SERVICE WEAPON / OOP1-KE / Object of Power" },
      { media: ["EX-03"], title: "The threat is already inside", label: "The Hiss invasion",
        text: "Beyond the office door lies a Bureau overrun. The Hiss is a hostile resonance that takes over people, objects and space itself. Some agents hang motionless in the air, repeating words that aren't theirs. Others turn their weapons on the survivors. In Central Executive, Jesse cleanses her first Control Point and helps take back part of the House.",
        caption: "THE HISS / Hostile resonance" },
      { media: ["EX-04"], title: "Eight inches of pure power", label: "Floppy Disk, Launch ability",
        text: "In the Pneumatics section, an ordinary-looking floppy disk hurls heavy objects at anyone who comes near. It once held missile launch codes. Now it has become a source of destructive force itself. By binding it, Jesse gains Launch, the ability to lift objects and turn her surroundings into a weapon.",
        caption: "FLOPPY DISK / OOP5-KE / Ability: Launch" },
      { media: ["EX-05"], title: "No one human on the other end", label: "The Hotline",
        text: "The red phone isn't connected to any ordinary network. The Hotline links the Director with the Board and carries messages from beyond the edges of familiar reality. Through it, Jesse also hears echoes of Trench. At the Bureau, even a phone call requires special clearance: only the Director can use this line.",
        caption: "HOTLINE / OOP3-UE / Line to the Board" }
    ] },
  { id: "maintenance", nav: "Maintenance", no: "03", en: "Maintenance Sector", bg: "BG-03",
    heading: "For the House to live, someone has to work",
    text: "Beneath the executive halls run pumps, converters and cooling systems. Here Jesse helps restore power to the Bureau, and learns that maintaining a paranatural building takes far more than a technical manual.",
    items: [
      { media: ["MA-01"], title: "The building's heart must not stop", label: "NSC Power Plant",
        text: "The giant NSC Power Plant keeps the Oldest House running independently of the city grid. The invasion has damaged its systems, and Jesse restores the converters and coolant pumps. The staff know the main rule: the temperature must stay under control. What actually lies inside the plant is known to very few.",
        caption: "NSC POWER PLANT / Power for the Oldest House" },
      { media: ["MA-02"], title: "Something has moved into the pipes", label: "The Clog",
        text: "In the service tunnels, a living mass that Ahti calls the Clog is spreading. It blocks the pipes and threatens the coolant system. By damaging its glowing growths, Jesse forces the creature back. Here a simple request to unclog the plumbing turns into a run-in with yet another resident of the House.",
        caption: "CLOG / Paranatural entity" },
      { media: ["MA-03"], title: "A ride that never stopped", label: "The Merry-Go-Round Horse",
        text: "Behind the break room lies an unstable space holding a merry-go-round horse. This Object of Power can dash across short distances in an instant. Once Jesse binds it, movement becomes her advantage: Evade lets her dodge out of the line of fire and cross dangerous ground.",
        caption: "MERRY-GO-ROUND HORSE / OOP16-KE / Ability: Evade" },
      { media: ["MA-04"], wide: true, title: "Behind a service door, an alien sky", label: "Black Rock Quarry",
        text: "The service corridors lead to a quarry open to another dimension. Here the Bureau mines Black Rock, which can suppress paranatural effects. It is used to contain dangerous phenomena, and its prisms are also needed for the agents' protective devices. Among the cliffs and lifts it becomes clear: from the outside, the House looks far smaller than it is.",
        caption: "BLACK ROCK QUARRY / Threshold to another dimension" }
    ] },
  { id: "research", nav: "Research", no: "04", en: "Research Sector", bg: "BG-04",
    heading: "The impossible, under observation",
    text: "A concrete atrium, trees, labs and restricted research areas. Here the Bureau tries to turn the inexplicable into knowledge. Dr. Darling's work helps make sense of the threat, and shows how dangerous discovery itself can be.",
    items: [
      { media: ["RE-01"], title: "Every miracle has a presentation number", label: "Dr. Casper Darling",
        text: "Head of Research Casper Darling explains Objects of Power with a teacher's enthusiasm. His recordings follow Jesse through the House: everyday things take on new properties, and impossible events get scientific names. But behind the lecturer's confidence, the unease of a man who has learned too much slowly shows through.",
        caption: "DR. CASPER DARLING / Head of Research" },
      { media: ["RE-02"], title: "The device that keeps you yourself", label: "Protection from resonance",
        text: "The chest devices worn by survivors are Hedron Resonance Amplifiers. Designed by Darling, they protect agents from being taken by the Hiss. In the HRA Lab, Jesse and Helen Marshall help restart their production. For the Bureau this is no longer experimental tech: a working device is what lets the resistance go on.",
        caption: "HRA / Hedron Resonance Amplifier" },
      { media: ["RE-03"], title: "You can step through this image", label: "The Slide Projector",
        text: "Found in Ordinary, the Slide Projector turns projected slides into passages to other dimensions. Its discovery changed the lives of Jesse and her brother Dylan forever. For the Bureau, it became the basis of research into other worlds. But an open passage works both ways: something else can come through into our reality.",
        caption: "SLIDE PROJECTOR / OOP15-UE / Object of Power" },
      { media: ["RE-04"], title: "A signal from another world", label: "Hedron",
        text: "A restricted part of the Research Sector holds Hedron, an entity discovered in one of the worlds beyond the projection. Darling studies its resonance and uses it to protect the Bureau. The huge chamber and its layered security show the scale of a discovery that was never fully understood.",
        caption: "HEDRON / Chamber in Dimensional Research" }
    ] },
  { id: "containment", nav: "Containment", no: "05", en: "Containment Sector", bg: "BG-05",
    heading: "Where they keep what can't be left outside",
    text: "Altered Items, dangerous objects and the remains of paranatural events. Here every room is an attempt to hold the unknown within set limits. This is also where Dylan's trail leads: the brother Jesse came to the Bureau to find.",
    items: [
      { media: ["CO-01"], wide: true, title: "Every door has its own rules", label: "The Panopticon",
        text: "The Panopticon is a vast vault of paranatural objects. Ordinary things are kept in separate cells because their behavior no longer follows ordinary logic. Frederick Langston oversees the containment protocols. Here safety depends on details that would seem meaningless outside the Bureau.",
        caption: "PANOPTICON / Vault for paranatural objects" },
      { media: ["CO-02"], title: "The floor is no longer the limit", label: "The Benicoff TV",
        text: "Broken out of containment, the television warps the space of its cell and the rooms around it. The way to it becomes a twisted corridor. After the fight, Jesse cleanses the object and gains Levitate. Now the vast halls of the House can be explored vertically, reaching places no stairs lead to.",
        caption: "BENICOFF TV / OOP7-KE / Ability: Levitate" },
      { media: ["CO-03"], title: "Don't look away", label: "Fridge Duty",
        text: "In one of the cells, a Bureau agent keeps constant watch over a refrigerator. Breaking eye contact is dangerous: the item slips out of control. A simple request to take over the shift turns into Jesse's encounter with the unknown. In the Panopticon, even the most ordinary thing can demand impossible discipline.",
        caption: "FRIDGE DUTY / Altered Item under observation" },
      { media: ["CO-04"], title: "To her, a brother. To the Bureau, P6.", label: "Dylan and the Prime Candidate Program",
        text: "Jesse has been searching for Dylan ever since the Bureau took him after the Ordinary incident. Here her search crosses paths with a program to prepare a future Director. Dylan was designated P6. Records nearby reveal another candidate, P7: someone the Bureau watched from outside its walls. Jesse herself.",
        caption: "PRIME CANDIDATE PROGRAM / P6: Dylan Faden / P7: Jesse Faden" }
    ] },
  { id: "astral", nav: "Astral Plane", no: "06", en: "Astral Plane", bg: "BG-06", light: true,
    heading: "Beyond architecture",
    text: "A white void, floating platforms and a black pyramid. The Astral Plane is tied to the House, its Director and the Objects of Power. Familiar rooms vanish here, but the trials remain, along with the presence of those who set them.",
    items: [
      { media: ["AS-01"], title: "Power must be mastered", label: "Binding Objects of Power",
        text: "Each time she binds an Object of Power, Jesse finds herself in a trial on the Astral Plane. Here she first learns new abilities: Launch, Evade, Levitate. Behind every familiar object lies access to something greater. Each new ability then changes how she moves and fights inside the House.",
        caption: "ASTRAL PLANE / Object of Power trials" },
      { media: ["AS-02"], title: "Who controls Control?", label: "The Board",
        text: "The Board speaks to the Director through an inverted black pyramid. It takes part in choosing the head of the Bureau and in binding Objects of Power. But its nature and intentions remain unclear. The more Jesse learns about the Oldest House, the harder the question becomes: who truly holds power here?",
        caption: "THE BOARD / Nature and intentions unknown" }
    ],
    finale: {
      heading: "You've seen only part of the House",
      text: "Behind the next door there may be just another office. Or everything that doesn't fit into your idea of the world.",
      cta: "Explore the Oldest House in Control.",
      /* official trailer not verified: honest link to the game page */
      trailer: { label: "Control trailers", url: "https://www.remedygames.com/games/control" },
      official: { label: "Official Control site", url: "https://www.remedygames.com/games/control" }
    } }
];
