import { useState, useEffect } from "react";

// ── Color palette ────────────────────────────────────────────────────────────
const C = {
  bg:      '#0D1117',
  sidebar: '#161B22',
  card:    '#161B22',
  cardAlt: '#21262D',
  border:  '#30363D',
  text:    '#C9D1D9',
  dim:     '#8B949E',
  accent:  '#58A6FF',
  green:   '#3FB950',
  red:     '#F85149',
  yellow:  '#D29922',
};
const mono = '"Consolas","Courier New",monospace';
const sans = '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';

// ── System templates ─────────────────────────────────────────────────────────
const SYSTEM_TEMPLATES = [
  {
    name: "Rental Property Move-Out",
    description: "Standard residential rental property move-out condition inspection",
    category: "residential",
    sections: [
      { id: "shared", name: "Shared Spaces", repeatable: false, items: [
        { id: "kitchen_cabinets",   label: "Kitchen – Cabinets",     type: "condition" },
        { id: "kitchen_counters",   label: "Kitchen – Countertops",  type: "condition" },
        { id: "kitchen_appliances", label: "Kitchen – Appliances",   type: "condition" },
        { id: "kitchen_sink",       label: "Kitchen – Sink/Faucet",  type: "condition" },
        { id: "living_room",        label: "Living Room",            type: "condition" },
        { id: "bathroom",           label: "Bathroom",               type: "condition" },
        { id: "hallways",           label: "Hallways/Stairs",        type: "condition" },
        { id: "laundry",            label: "Laundry",                type: "condition" },
        { id: "garage",             label: "Garage",                 type: "condition" },
        { id: "exterior",           label: "Exterior",               type: "condition" },
      ]},
      { id: "bedroom", name: "Bedroom", repeatable: true, items: [
        { id: "walls_ceiling", label: "Walls/Ceiling",     type: "condition" },
        { id: "floors",        label: "Floors/Carpet",     type: "condition" },
        { id: "closet",        label: "Closet",            type: "condition" },
        { id: "windows",       label: "Windows/Blinds",    type: "condition" },
        { id: "doors",         label: "Doors/Hardware",    type: "condition" },
        { id: "outlets",       label: "Outlets/Switches",  type: "condition" },
      ]},
    ],
  },
  {
    name: "Home Buyer Inspection",
    description: "Comprehensive pre-purchase home inspection for prospective buyers",
    category: "residential",
    sections: [
      { id: "exterior", name: "Exterior", repeatable: false, items: [
        { id: "foundation",   label: "Foundation",          type: "condition" },
        { id: "siding",       label: "Siding/Cladding",     type: "condition" },
        { id: "roof",         label: "Roof Condition",      type: "condition" },
        { id: "gutters",      label: "Gutters/Downspouts",  type: "condition" },
        { id: "windows_ext",  label: "Windows (Exterior)",  type: "condition" },
        { id: "doors_ext",    label: "Doors (Exterior)",    type: "condition" },
        { id: "driveway",     label: "Driveway/Walkways",   type: "condition" },
        { id: "deck_patio",   label: "Deck/Patio/Porch",    type: "condition" },
      ]},
      { id: "garage_hb", name: "Garage", repeatable: false, items: [
        { id: "garage_door",   label: "Garage Door",        type: "condition" },
        { id: "garage_opener", label: "Opener/Sensors",     type: "passfail"  },
        { id: "garage_floor",  label: "Floor/Slab",         type: "condition" },
        { id: "garage_walls",  label: "Walls/Ceiling",      type: "condition" },
      ]},
      { id: "kitchen_hb", name: "Kitchen", repeatable: false, items: [
        { id: "k_cabinets",    label: "Cabinets",           type: "condition" },
        { id: "k_counters",    label: "Countertops",        type: "condition" },
        { id: "k_appliances",  label: "Appliances",         type: "condition" },
        { id: "k_sink",        label: "Sink/Faucet",        type: "condition" },
        { id: "k_ventilation", label: "Range Hood/Vent",    type: "condition" },
        { id: "k_gfci",        label: "GFCI Outlets",       type: "passfail"  },
      ]},
      { id: "bathrooms_hb", name: "Bathrooms", repeatable: true, items: [
        { id: "b_toilet",      label: "Toilet",             type: "condition" },
        { id: "b_sink",        label: "Sink/Faucet",        type: "condition" },
        { id: "b_tub",         label: "Tub/Shower",         type: "condition" },
        { id: "b_vanity",      label: "Vanity/Cabinets",    type: "condition" },
        { id: "b_vent",        label: "Ventilation Fan",    type: "passfail"  },
        { id: "b_gfci",        label: "GFCI Outlet",        type: "passfail"  },
      ]},
      { id: "electrical", name: "Electrical", repeatable: false, items: [
        { id: "e_panel",  label: "Main Panel/Breakers",     type: "condition" },
        { id: "e_gfci",   label: "GFCI (wet areas)",        type: "passfail"  },
        { id: "e_smoke",  label: "Smoke/CO Detectors",      type: "passfail"  },
      ]},
      { id: "plumbing", name: "Plumbing", repeatable: false, items: [
        { id: "p_water_heater", label: "Water Heater",      type: "condition" },
        { id: "p_supply",       label: "Supply/Pressure",   type: "passfail"  },
        { id: "p_drainage",     label: "Drainage/Sewer",    type: "passfail"  },
      ]},
      { id: "hvac", name: "HVAC", repeatable: false, items: [
        { id: "h_furnace",    label: "Furnace/Heating",     type: "condition" },
        { id: "h_ac",         label: "Air Conditioning",    type: "condition" },
        { id: "h_filters",    label: "Filters",             type: "condition" },
        { id: "h_thermostat", label: "Thermostat",          type: "passfail"  },
      ]},
      { id: "attic", name: "Attic", repeatable: false, items: [
        { id: "at_insulation", label: "Insulation",         type: "condition" },
        { id: "at_ventilation",label: "Ventilation",        type: "passfail"  },
        { id: "at_moisture",   label: "Moisture/Staining",  type: "passfail"  },
      ]},
      { id: "basement", name: "Basement/Crawlspace", repeatable: false, items: [
        { id: "bas_walls",   label: "Foundation Walls",     type: "condition" },
        { id: "bas_moisture",label: "Water Intrusion",      type: "passfail"  },
        { id: "bas_sump",    label: "Sump Pump (if present)",type:"passfail"  },
      ]},
    ],
  },
  {
    name: "Vehicle Maintenance Inspection",
    description: "Routine vehicle maintenance and safety check",
    category: "automotive",
    sections: [
      { id: "engine_vm", name: "Engine/Fluids", repeatable: false, items: [
        { id: "vm_oil",        label: "Engine Oil Level/Condition",  type: "passfail" },
        { id: "vm_coolant",    label: "Coolant Level/Condition",     type: "passfail" },
        { id: "vm_brake_fl",   label: "Brake Fluid Level",           type: "passfail" },
        { id: "vm_battery",    label: "Battery/Terminals",           type: "condition"},
        { id: "vm_belts",      label: "Belts/Hoses",                 type: "condition"},
        { id: "vm_air_filter", label: "Air Filter",                  type: "condition"},
      ]},
      { id: "tires_vm", name: "Tires & Wheels", repeatable: false, items: [
        { id: "vm_tire_fl", label: "Front Left – Tread/Pressure",    type: "condition"},
        { id: "vm_tire_fr", label: "Front Right – Tread/Pressure",   type: "condition"},
        { id: "vm_tire_rl", label: "Rear Left – Tread/Pressure",     type: "condition"},
        { id: "vm_tire_rr", label: "Rear Right – Tread/Pressure",    type: "condition"},
        { id: "vm_spare",   label: "Spare Tire",                     type: "passfail" },
      ]},
      { id: "brakes_vm", name: "Brakes", repeatable: false, items: [
        { id: "vm_pads_f",  label: "Front Brake Pads",               type: "condition"},
        { id: "vm_pads_r",  label: "Rear Brake Pads",                type: "condition"},
        { id: "vm_rotors",  label: "Rotors/Drums",                   type: "condition"},
        { id: "vm_parking", label: "Parking Brake",                  type: "passfail" },
      ]},
      { id: "lights_vm", name: "Lights", repeatable: false, items: [
        { id: "vm_head",    label: "Headlights",                     type: "passfail" },
        { id: "vm_tail",    label: "Taillights",                     type: "passfail" },
        { id: "vm_brake_l", label: "Brake Lights",                   type: "passfail" },
        { id: "vm_turn",    label: "Turn Signals",                   type: "passfail" },
        { id: "vm_hazards", label: "Hazard Lights",                  type: "passfail" },
      ]},
      { id: "interior_vm", name: "Interior/Safety", repeatable: false, items: [
        { id: "vm_windshield",  label: "Windshield (cracks/chips)", type: "condition"},
        { id: "vm_wipers",      label: "Wiper Blades",              type: "condition"},
        { id: "vm_mirrors",     label: "Mirrors (all)",             type: "passfail" },
        { id: "vm_seatbelts",   label: "Seatbelts (all positions)", type: "passfail" },
        { id: "vm_emergency",   label: "Emergency Kit",             type: "passfail" },
      ]},
    ],
  },
  {
    name: "Commercial Vehicle Annual Inspection",
    description: "DOT-compliant annual commercial motor vehicle inspection (FMCSA 49 CFR Part 396)",
    category: "automotive",
    sections: [
      { id: "engine_cmv", name: "Engine Compartment", repeatable: false, items: [
        { id: "cmv_oil",     label: "Engine Oil",           type: "passfail" },
        { id: "cmv_coolant", label: "Coolant System",       type: "passfail" },
        { id: "cmv_belts",   label: "Belts/Hoses",          type: "passfail" },
        { id: "cmv_battery", label: "Battery/Cables",       type: "passfail" },
        { id: "cmv_exhaust", label: "Exhaust/Leaks",        type: "passfail" },
      ]},
      { id: "cab_cmv", name: "Cab/In-Cab", repeatable: false, items: [
        { id: "cmv_mirrors",   label: "Mirrors",            type: "passfail" },
        { id: "cmv_gauges",    label: "Gauges/Warning Lights",type:"passfail"},
        { id: "cmv_wipers",    label: "Windshield Wipers",  type: "passfail" },
        { id: "cmv_horn",      label: "Horn",               type: "passfail" },
        { id: "cmv_seatbelt",  label: "Seatbelt",           type: "passfail" },
        { id: "cmv_fire_ext",  label: "Fire Extinguisher",  type: "passfail" },
        { id: "cmv_emergency", label: "Emergency Triangles",type: "passfail" },
      ]},
      { id: "lights_cmv", name: "Lights/Reflectors", repeatable: false, items: [
        { id: "cmv_head",       label: "Headlights",         type: "passfail" },
        { id: "cmv_tail",       label: "Tail/Clearance Lights",type:"passfail"},
        { id: "cmv_brake_l",    label: "Brake/Stop Lights",  type: "passfail" },
        { id: "cmv_turn",       label: "Turn Signals (all)", type: "passfail" },
        { id: "cmv_reflectors", label: "Reflectors/Tape",    type: "passfail" },
      ]},
      { id: "brakes_cmv", name: "Brake System", repeatable: false, items: [
        { id: "cmv_service",    label: "Service Brakes",        type: "passfail" },
        { id: "cmv_parking_b",  label: "Parking/Emergency Brake",type:"passfail"},
        { id: "cmv_air_lines",  label: "Air Lines/Hoses",       type: "passfail" },
        { id: "cmv_slack",      label: "Slack Adjusters",       type: "passfail" },
        { id: "cmv_drums",      label: "Brake Drums/Linings",   type: "passfail" },
      ]},
      { id: "axles_cmv", name: "Axles/Tires", repeatable: false, items: [
        { id: "cmv_fa_tires",  label: "Front Axle Tires",     type: "passfail" },
        { id: "cmv_fa_hubs",   label: "Front Hub Seals",      type: "passfail" },
        { id: "cmv_da_tires",  label: "Drive Axle Tires",     type: "passfail" },
        { id: "cmv_da_hubs",   label: "Drive Hub Seals",      type: "passfail" },
        { id: "cmv_driveshaft",label: "Driveshaft/U-Joints",  type: "passfail" },
      ]},
      { id: "coupling_cmv", name: "Coupling/Fifth Wheel", repeatable: false, items: [
        { id: "cmv_fifth",       label: "Fifth Wheel/Locking Jaws", type: "passfail" },
        { id: "cmv_kingpin",     label: "Kingpin/Apron",            type: "passfail" },
        { id: "cmv_safety_ch",   label: "Safety Chains/Cables",     type: "passfail" },
        { id: "cmv_glad_hands",  label: "Glad Hands (air connectors)",type:"passfail"},
      ]},
    ],
  },
  {
    name: "Aviation Pre-Flight Inspection",
    description: "Standard general aviation pre-flight checklist (adapt to aircraft POH/AFM)",
    category: "aviation",
    sections: [
      { id: "docs_av", name: "Documentation (ARROW)", repeatable: false, items: [
        { id: "av_airworthiness", label: "Airworthiness Certificate (displayed)", type: "passfail" },
        { id: "av_registration",  label: "Aircraft Registration",                 type: "passfail" },
        { id: "av_radio",         label: "Radio/Station License",                 type: "passfail" },
        { id: "av_poh",           label: "POH/AFM On Board",                      type: "passfail" },
        { id: "av_wx",            label: "Weather Briefing Obtained",             type: "passfail" },
        { id: "av_notams",        label: "NOTAMs/TFRs Checked",                  type: "passfail" },
        { id: "av_wb",            label: "Weight & Balance Verified",             type: "passfail" },
      ]},
      { id: "cockpit_av", name: "Cockpit/Interior", repeatable: false, items: [
        { id: "av_controls",  label: "Flight Controls – Free & Correct",         type: "passfail" },
        { id: "av_instruments",label: "Instruments/Avionics",                    type: "passfail" },
        { id: "av_fuel_sel",  label: "Fuel Selector – Both",                     type: "passfail" },
        { id: "av_elb",       label: "Emergency Equipment (ELT, fire ext)",      type: "passfail" },
        { id: "av_seats",     label: "Seats/Seatbelts Secure",                   type: "passfail" },
      ]},
      { id: "walkaround_av", name: "Exterior Walk-Around", repeatable: false, items: [
        { id: "av_fuselage",    label: "Fuselage – Condition/Damage",            type: "passfail" },
        { id: "av_left_wing",   label: "Left Wing – Condition/Fuel Cap",         type: "passfail" },
        { id: "av_left_ctrl",   label: "Left Aileron/Flap",                      type: "passfail" },
        { id: "av_right_wing",  label: "Right Wing – Condition/Fuel Cap",        type: "passfail" },
        { id: "av_right_ctrl",  label: "Right Aileron/Flap",                     type: "passfail" },
        { id: "av_tail",        label: "Empennage – Elevator/Rudder",            type: "passfail" },
        { id: "av_gear",        label: "Landing Gear/Tires",                     type: "passfail" },
        { id: "av_prop",        label: "Propeller – Nicks/Cracks",               type: "passfail" },
      ]},
      { id: "engine_av", name: "Engine/Cowling", repeatable: false, items: [
        { id: "av_oil",      label: "Oil Level",                                 type: "passfail" },
        { id: "av_induction",label: "Air Induction/Filter",                      type: "passfail" },
        { id: "av_cowling",  label: "Cowling Latches Secure",                    type: "passfail" },
        { id: "av_exhaust",  label: "Exhaust Stacks – No Cracks",                type: "passfail" },
      ]},
      { id: "fuel_av", name: "Fuel", repeatable: false, items: [
        { id: "av_fuel_qty",  label: "Fuel Quantity – Verified",                 type: "passfail" },
        { id: "av_fuel_sump", label: "Fuel Sumps – Contamination Check",         type: "passfail" },
        { id: "av_fuel_type", label: "Correct Fuel Grade (100LL/Jet-A)",         type: "passfail" },
        { id: "av_fuel_caps", label: "All Fuel Caps Secure",                     type: "passfail" },
      ]},
      { id: "runup_av", name: "Engine Run-Up", repeatable: false, items: [
        { id: "av_oil_psi",   label: "Oil Pressure – In Green",                  type: "passfail" },
        { id: "av_mag_check", label: "Magneto Check – Within Limits",            type: "passfail" },
        { id: "av_carb_heat", label: "Carb Heat (if applicable)",                type: "passfail" },
        { id: "av_gauges",    label: "All Engine Gauges – In Green",             type: "passfail" },
      ]},
    ],
  },
  {
    name: "CDL Pre-Trip Inspection",
    description: "FMCSA-compliant CDL pre-trip vehicle inspection (49 CFR 392.7)",
    category: "automotive",
    sections: [
      { id: "engine_cdl", name: "Engine Compartment", repeatable: false, items: [
        { id: "cdl_oil",     label: "Engine Oil Level",          type: "passfail" },
        { id: "cdl_coolant", label: "Coolant Level",             type: "passfail" },
        { id: "cdl_ps",      label: "Power Steering Fluid",      type: "passfail" },
        { id: "cdl_battery", label: "Battery/Cables/Connections",type: "passfail" },
        { id: "cdl_belts",   label: "Alternator/Fan Belts",      type: "passfail" },
        { id: "cdl_leaks",   label: "Engine – No Fluid Leaks",   type: "passfail" },
      ]},
      { id: "cab_cdl", name: "In-Cab Checks", repeatable: false, items: [
        { id: "cdl_air_psi",   label: "Air Pressure (90–120 PSI)",          type: "passfail" },
        { id: "cdl_low_air",   label: "Low Air Warning Buzzer/Light",        type: "passfail" },
        { id: "cdl_park_test", label: "Parking Brake – Hold Test",           type: "passfail" },
        { id: "cdl_svc_test",  label: "Service Brake – Response Test",       type: "passfail" },
        { id: "cdl_steering",  label: "Steering Wheel (max 10° play)",       type: "passfail" },
        { id: "cdl_mirrors",   label: "Mirrors – Clean & Adjusted",          type: "passfail" },
        { id: "cdl_gauges",    label: "Gauges/Warning Lights",               type: "passfail" },
        { id: "cdl_horn",      label: "Horn",                                type: "passfail" },
        { id: "cdl_wipers",    label: "Windshield Wipers/Washer",            type: "passfail" },
        { id: "cdl_seatbelt",  label: "Seatbelt Operational",                type: "passfail" },
        { id: "cdl_fire_ext",  label: "Fire Extinguisher (charged)",         type: "passfail" },
        { id: "cdl_triangles", label: "Emergency Triangles",                 type: "passfail" },
        { id: "cdl_fuses",     label: "Spare Fuses",                         type: "passfail" },
      ]},
      { id: "lights_cdl", name: "Lights/Reflectors", repeatable: false, items: [
        { id: "cdl_headlights",  label: "Headlights (high & low)",           type: "passfail" },
        { id: "cdl_clearance",   label: "Tail/Clearance/Marker Lights",      type: "passfail" },
        { id: "cdl_brake_l",     label: "Brake/Stop Lights",                 type: "passfail" },
        { id: "cdl_turn",        label: "Turn Signals (all)",                type: "passfail" },
        { id: "cdl_backup",      label: "Backup Lights/Alarm",               type: "passfail" },
        { id: "cdl_reflectors",  label: "Reflectors/Reflective Tape",        type: "passfail" },
      ]},
      { id: "front_cdl", name: "Front Axle", repeatable: false, items: [
        { id: "cdl_fa_tread",  label: "Tires – Tread Depth (min 4/32\")",    type: "passfail" },
        { id: "cdl_fa_psi",    label: "Tires – Proper Inflation",             type: "passfail" },
        { id: "cdl_fa_rims",   label: "Rims – No Cracks/Missing Lugs",       type: "passfail" },
        { id: "cdl_fa_hubs",   label: "Hub Seals – No Leaks",                type: "passfail" },
        { id: "cdl_fa_kp",     label: "King Pins/Wheel Bearings",            type: "passfail" },
      ]},
      { id: "drive_cdl", name: "Drive Axles", repeatable: false, items: [
        { id: "cdl_da_tires",  label: "Tires – All Positions (min 2/32\")",  type: "passfail" },
        { id: "cdl_da_duals",  label: "Dual Tires Not Touching",             type: "passfail" },
        { id: "cdl_da_rims",   label: "Rims/Lug Nuts Secure",                type: "passfail" },
        { id: "cdl_da_hubs",   label: "Hub Seals – No Leaks",                type: "passfail" },
        { id: "cdl_driveshaft",label: "Driveshaft/U-Joints Secure",          type: "passfail" },
      ]},
      { id: "brakes_cdl", name: "Brake System", repeatable: false, items: [
        { id: "cdl_air_lines", label: "Air Lines/Hoses – No Leaks/Chafing",  type: "passfail" },
        { id: "cdl_slack",     label: "Slack Adjusters – Properly Adjusted", type: "passfail" },
        { id: "cdl_drums",     label: "Brake Drums/Shoes/Pads",              type: "passfail" },
      ]},
      { id: "coupling_cdl", name: "Coupling System (if applicable)", repeatable: false, items: [
        { id: "cdl_fifth",      label: "Fifth Wheel – Lubed/Locked",         type: "passfail" },
        { id: "cdl_glad_hands", label: "Glad Hands Sealed/Locked",           type: "passfail" },
        { id: "cdl_safety_ch",  label: "Safety Chains/Cables",               type: "passfail" },
        { id: "cdl_trailer_l",  label: "Trailer Lights Connected/Working",   type: "passfail" },
      ]},
    ],
  },
];

// ── Seed system templates (one-time, idempotent) ──────────────────────────────
async function seedSystemTemplates(supabase) {
  try {
    const { data } = await supabase.from("inspection_templates")
      .select("id").eq("is_system", true).limit(1);
    if (data?.length) return;
    for (const t of SYSTEM_TEMPLATES) {
      await supabase.from("inspection_templates").insert({
        name: t.name, description: t.description, category: t.category,
        sections: t.sections, is_system: true, org_id: null,
      });
    }
  } catch (e) {
    console.warn("seedSystemTemplates:", e.message);
  }
}

// ── Small reusable UI pieces ──────────────────────────────────────────────────
function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: 10, padding: "18px 22px", minWidth: 140 }}>
      <div style={{ fontSize: 28, fontWeight: 700, color: color || C.text, fontFamily: sans }}>{value}</div>
      <div style={{ fontSize: 12, color: C.dim, marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Badge({ label, color }) {
  const map = { residential: C.green, automotive: C.yellow, aviation: "#C084FC", custom: C.accent };
  const bg  = (map[color] || C.dim) + "22";
  const fg  = map[color] || C.dim;
  return (
    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 20, background: bg, color: fg, fontSize: 11, fontWeight: 600 }}>{label}</span>
  );
}

function Input({ label, value, onChange, type = "text", placeholder }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <div style={{ fontSize: 11, color: C.dim, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.8 }}>{label}</div>}
      <input type={type} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)}
        style={{ width: "100%", padding: "9px 12px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, fontSize: 13, fontFamily: mono, boxSizing: "border-box" }} />
    </div>
  );
}

function Btn({ onClick, children, variant = "primary", small }) {
  const styles = {
    primary:   { background: C.accent,   color: "#fff" },
    secondary: { background: C.cardAlt,  color: C.text },
    danger:    { background: C.red+"22", color: C.red  },
    success:   { background: C.green+"22", color: C.green },
  };
  return (
    <button onClick={onClick} style={{ ...styles[variant], border: `1px solid ${C.border}`, borderRadius: 6, padding: small ? "5px 12px" : "8px 16px", fontSize: small ? 11 : 13, cursor: "pointer", fontFamily: mono, fontWeight: 600 }}>
      {children}
    </button>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar({ view, onNav, onLogout, profile }) {
  const items = [
    { id: "dashboard", label: "Dashboard" },
    { id: "clients",   label: "Clients"   },
    { id: "tablets",   label: "Tablets"   },
    { id: "history",   label: "Login History" },
    { id: "templates", label: "Templates" },
  ];
  return (
    <div style={{ width: 220, minHeight: "100vh", background: C.sidebar, display: "flex", flexDirection: "column", borderRight: `1px solid ${C.border}`, flexShrink: 0 }}>
      <div style={{ padding: "24px 20px 20px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 10, color: C.accent, fontWeight: 700, letterSpacing: 3, marginBottom: 4 }}>IT ADMINISTRATION</div>
        <div style={{ fontSize: 12, color: C.dim }}>{profile?.email}</div>
      </div>
      <nav style={{ flex: 1, paddingTop: 8 }}>
        {items.map(({ id, label }) => (
          <button key={id} onClick={() => onNav(id)} style={{
            display: "block", width: "100%", textAlign: "left",
            padding: "10px 20px", background: view === id ? C.cardAlt : "transparent",
            color: view === id ? C.accent : C.dim, border: "none", cursor: "pointer",
            fontSize: 13, fontFamily: mono, borderLeft: `3px solid ${view === id ? C.accent : "transparent"}`,
          }}>{label}</button>
        ))}
      </nav>
      <div style={{ padding: "16px 20px", borderTop: `1px solid ${C.border}` }}>
        <Btn onClick={onLogout} variant="danger" small>Sign Out</Btn>
      </div>
    </div>
  );
}

// ── IT Dashboard ──────────────────────────────────────────────────────────────
function ITDashboard({ supabase }) {
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    (async () => {
      const [orgs, tablets, users, inspections, hist] = await Promise.all([
        supabase.from("organizations").select("id", { count: "exact", head: true }),
        supabase.from("tablets").select("id,last_seen_at"),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("inspections").select("id", { count: "exact", head: true }),
        supabase.from("login_history").select("*").order("created_at", { ascending: false }).limit(15),
      ]);
      const cutoff24 = Date.now() - 86400000;
      const active = (tablets.data || []).filter(t => t.last_seen_at && new Date(t.last_seen_at) > cutoff24).length;
      setStats({ orgs: orgs.count || 0, tablets: (tablets.data || []).length, active, users: users.count || 0, inspections: inspections.count || 0 });
      setActivity(hist.data || []);
    })();
  }, [supabase]);

  const fmtTime = iso => {
    if (!iso) return "–";
    const d = new Date(iso);
    return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div>
      <h2 style={{ color: C.text, fontFamily: sans, marginBottom: 24, fontWeight: 700 }}>Dashboard</h2>
      {stats && (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 32 }}>
          <StatCard label="Clients" value={stats.orgs} color={C.accent} />
          <StatCard label="Tablets" value={stats.tablets} sub={`${stats.active} active (24h)`} color={C.green} />
          <StatCard label="Users" value={stats.users} color={C.dim} />
          <StatCard label="Inspections" value={stats.inspections} color={C.yellow} />
        </div>
      )}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, fontSize: 13, color: C.dim, fontFamily: sans }}>Recent Activity</div>
        {activity.length === 0 && <div style={{ padding: 20, color: C.dim, fontSize: 13 }}>No activity recorded yet.</div>}
        {activity.map(row => (
          <div key={row.id} style={{ display: "flex", alignItems: "center", padding: "10px 20px", borderBottom: `1px solid ${C.border}`, gap: 12 }}>
            <span style={{ fontSize: 10, color: row.event === "login" ? C.green : C.red, background: (row.event === "login" ? C.green : C.red) + "22", padding: "2px 8px", borderRadius: 20, fontWeight: 700, minWidth: 50, textAlign: "center" }}>
              {row.event?.toUpperCase()}
            </span>
            <span style={{ fontSize: 13, color: C.text, flex: 1 }}>{row.user_name || row.user_email || "–"}</span>
            <span style={{ fontSize: 11, color: C.dim }}>{row.device_name || row.mac_address || "–"}</span>
            <span style={{ fontSize: 11, color: C.dim, minWidth: 140, textAlign: "right" }}>{fmtTime(row.created_at)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Client Manager ────────────────────────────────────────────────────────────
function ClientManager({ supabase }) {
  const [orgs,        setOrgs]        = useState([]);
  const [selectedId,  setSelectedId]  = useState("");
  const [detail,      setDetail]      = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [modal,       setModal]       = useState(null);

  const load = async () => {
    const { data } = await supabase.from("organizations").select("*").order("name");
    setOrgs(data || []);
  };
  useEffect(() => { load(); }, [supabase]);

  // Load full detail for the selected org
  useEffect(() => {
    if (!selectedId) { setDetail(null); return; }
    setDetailLoading(true);
    (async () => {
      const [usersRes, tabletsRes, inspRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("org_id", selectedId).order("full_name"),
        supabase.from("tablets").select("*").eq("org_id", selectedId).order("last_seen_at", { ascending: false }),
        supabase.from("inspections").select("id", { count: "exact", head: true }).eq("org_id", selectedId),
      ]);
      setDetail({
        org: orgs.find(o => o.id === selectedId),
        users: usersRes.data || [],
        tablets: tabletsRes.data || [],
        inspectionCount: inspRes.count || 0,
      });
      setDetailLoading(false);
    })();
  }, [selectedId, orgs, supabase]);

  const save = async () => {
    if (!modal.name?.trim()) return;
    if (modal.id) {
      await supabase.from("organizations").update({ name: modal.name, contact_email: modal.contact_email, address: modal.address, notes: modal.notes }).eq("id", modal.id);
    } else {
      await supabase.from("organizations").insert({ name: modal.name, contact_email: modal.contact_email, address: modal.address, notes: modal.notes });
    }
    setModal(null); load();
  };

  const [toggleErr, setToggleErr] = useState("");
  const toggleActive = async (org) => {
    setToggleErr("");
    const newVal = !org.is_active;
    const { error } = await supabase.from("organizations")
      .update({ is_active: newVal }).eq("id", org.id);
    if (error) { setToggleErr(error.message); return; }
    // Patch local state directly — no need for a full re-fetch
    const updated = { ...org, is_active: newVal };
    setOrgs(prev => prev.map(o => o.id === org.id ? updated : o));
    if (detail?.org?.id === org.id) {
      setDetail(prev => ({ ...prev, org: updated }));
    }
  };

  const tabletStatus = (t) => {
    if (!t.last_seen_at) return { label: "Never", color: C.dim };
    const age = Date.now() - new Date(t.last_seen_at);
    if (age < 3600000)  return { label: "Online",  color: C.green  };
    if (age < 86400000) return { label: "Recent",  color: C.yellow };
    return { label: "Offline", color: C.red };
  };

  const fmtDate = iso => iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "–";
  const fmtTime = iso => iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "–";

  const Section = ({ title, children }) => (
    <div style={{ marginTop: 20 }}>
      <div style={{ fontSize: 11, color: C.dim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );

  return (
    <div>
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ color: C.text, fontFamily: sans, fontWeight: 700, margin: 0 }}>Clients</h2>
        <Btn onClick={() => setModal({ name: "", contact_email: "", address: "", notes: "" })}>+ Add Client</Btn>
      </div>

      {toggleErr && (
        <div style={{ background: C.red+"22", color: C.red, border: `1px solid ${C.red}44`, borderRadius: 8, padding: "10px 16px", marginBottom: 16, fontSize: 13 }}>
          Update failed: {toggleErr}
        </div>
      )}

      {/* Client selector dropdown */}
      <div style={{ marginBottom: 20 }}>
        <select value={selectedId} onChange={e => setSelectedId(e.target.value)}
          style={{ width: "100%", padding: "10px 14px", background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: 8, color: selectedId ? C.text : C.dim, fontSize: 14, fontFamily: sans, cursor: "pointer" }}>
          <option value="">— Select a client to view details —</option>
          {orgs.map(o => <option key={o.id} value={o.id}>{o.name}{!o.is_active ? " (Inactive)" : ""}</option>)}
        </select>
      </div>

      {/* Detail panel */}
      {selectedId && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 24 }}>
          {detailLoading && <div style={{ color: C.dim, fontSize: 13 }}>Loading…</div>}
          {!detailLoading && detail && (() => {
            const { org, users, tablets, inspectionCount } = detail;
            return (
              <>
                {/* Org header */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: C.text, fontFamily: sans }}>{org.name}</div>
                    <div style={{ marginTop: 6, display: "flex", gap: 16, flexWrap: "wrap" }}>
                      {org.contact_email && <span style={{ fontSize: 13, color: C.dim }}>✉ {org.contact_email}</span>}
                      {org.address       && <span style={{ fontSize: 13, color: C.dim }}>📍 {org.address}</span>}
                      <span style={{ fontSize: 13, color: C.dim }}>Since {fmtDate(org.created_at)}</span>
                    </div>
                    {org.notes && <div style={{ marginTop: 8, fontSize: 13, color: C.dim, fontStyle: "italic" }}>{org.notes}</div>}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <Badge label={org.is_active ? "Active" : "Inactive"} color={org.is_active ? "residential" : undefined} />
                    <Btn small variant="secondary" onClick={() => setModal({ ...org })}>Edit</Btn>
                    <Btn small variant={org.is_active ? "danger" : "success"} onClick={() => toggleActive(org)}>
                      {org.is_active ? "Deactivate" : "Activate"}
                    </Btn>
                  </div>
                </div>

                {/* Stats row */}
                <div style={{ display: "flex", gap: 16, marginTop: 20 }}>
                  {[
                    { label: "Users",        value: users.length },
                    { label: "Tablets",      value: tablets.length },
                    { label: "Inspections",  value: inspectionCount },
                  ].map(s => (
                    <div key={s.label} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 20px", textAlign: "center" }}>
                      <div style={{ fontSize: 22, fontWeight: 700, color: C.accent, fontFamily: sans }}>{s.value}</div>
                      <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Users */}
                <Section title={`Users (${users.length})`}>
                  {users.length === 0
                    ? <div style={{ fontSize: 13, color: C.dim }}>No users assigned to this client.</div>
                    : (
                      <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px", padding: "8px 16px", background: C.bg, fontSize: 11, color: C.dim, textTransform: "uppercase", letterSpacing: 0.8 }}>
                          <span>Name / Email</span><span>Email</span><span>Role</span>
                        </div>
                        {users.map(u => (
                          <div key={u.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px", padding: "10px 16px", borderTop: `1px solid ${C.border}`, alignItems: "center" }}>
                            <span style={{ fontSize: 13, color: C.text }}>{u.full_name || "–"}</span>
                            <span style={{ fontSize: 12, color: C.dim }}>{u.email || "–"}</span>
                            <Badge label={u.role} color={u.role === "admin" ? "aviation" : undefined} />
                          </div>
                        ))}
                      </div>
                    )
                  }
                </Section>

                {/* Tablets */}
                <Section title={`Tablets (${tablets.length})`}>
                  {tablets.length === 0
                    ? <div style={{ fontSize: 13, color: C.dim }}>No tablets assigned to this client.</div>
                    : (
                      <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 160px 120px 80px", padding: "8px 16px", background: C.bg, fontSize: 11, color: C.dim, textTransform: "uppercase", letterSpacing: 0.8 }}>
                          <span>Device Name</span><span>MAC Address</span><span>Last Seen</span><span>Status</span>
                        </div>
                        {tablets.map(t => {
                          const s = tabletStatus(t);
                          return (
                            <div key={t.id} style={{ display: "grid", gridTemplateColumns: "1fr 160px 120px 80px", padding: "10px 16px", borderTop: `1px solid ${C.border}`, alignItems: "center" }}>
                              <span style={{ fontSize: 13, color: C.text }}>{t.device_name || "–"}</span>
                              <span style={{ fontSize: 11, color: C.dim, fontFamily: mono }}>{t.mac_address}</span>
                              <span style={{ fontSize: 12, color: C.dim }}>{fmtTime(t.last_seen_at)}</span>
                              <span style={{ fontSize: 11, color: s.color, fontWeight: 700 }}>{s.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    )
                  }
                </Section>
              </>
            );
          })()}
        </div>
      )}

      {/* Full list when nothing is selected */}
      {!selectedId && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px 160px", padding: "10px 20px", borderBottom: `1px solid ${C.border}`, fontSize: 11, color: C.dim, textTransform: "uppercase", letterSpacing: 0.8 }}>
            <span>Name</span><span>Email</span><span>Status</span><span></span>
          </div>
          {orgs.length === 0 && <div style={{ padding: 20, color: C.dim, fontSize: 13 }}>No clients yet.</div>}
          {orgs.map(org => (
            <div key={org.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 80px 160px", padding: "12px 20px", borderBottom: `1px solid ${C.border}`, alignItems: "center" }}>
              <button onClick={() => setSelectedId(org.id)}
                style={{ background: "none", border: "none", color: C.accent, fontSize: 13, fontWeight: 600, cursor: "pointer", textAlign: "left", fontFamily: sans, padding: 0 }}>
                {org.name}
              </button>
              <span style={{ fontSize: 12, color: C.dim }}>{org.contact_email || "–"}</span>
              <Badge label={org.is_active ? "Active" : "Inactive"} color={org.is_active ? "residential" : undefined} />
              <div style={{ display: "flex", gap: 6 }}>
                <Btn small variant="secondary" onClick={() => setModal({ ...org })}>Edit</Btn>
                <Btn small variant={org.is_active ? "danger" : "success"} onClick={() => toggleActive(org)}>
                  {org.is_active ? "Deactivate" : "Activate"}
                </Btn>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit modal */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 28, width: 420, fontFamily: mono }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 20 }}>{modal.id ? "Edit Client" : "Add Client"}</div>
            <Input label="Organization Name" value={modal.name} onChange={v => setModal(m => ({ ...m, name: v }))} />
            <Input label="Contact Email" value={modal.contact_email || ""} onChange={v => setModal(m => ({ ...m, contact_email: v }))} type="email" />
            <Input label="Address" value={modal.address || ""} onChange={v => setModal(m => ({ ...m, address: v }))} />
            <Input label="Notes" value={modal.notes || ""} onChange={v => setModal(m => ({ ...m, notes: v }))} />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
              <Btn variant="secondary" onClick={() => setModal(null)}>Cancel</Btn>
              <Btn onClick={save}>Save</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tablet Tracker ────────────────────────────────────────────────────────────
function TabletTracker({ supabase }) {
  const [tablets, setTablets] = useState([]);
  const [orgs, setOrgs]       = useState([]);
  const [modal, setModal]     = useState(null);

  const load = async () => {
    const [t, o] = await Promise.all([
      supabase.from("tablets").select("*").order("last_seen_at", { ascending: false }),
      supabase.from("organizations").select("id,name"),
    ]);
    setTablets(t.data || []); setOrgs(o.data || []);
  };
  useEffect(() => { load(); }, [supabase]);

  const tabletStatus = (t) => {
    if (!t.last_seen_at) return { label: "Never", color: C.dim };
    const age = Date.now() - new Date(t.last_seen_at);
    if (age < 3600000)   return { label: "Online",  color: C.green  };
    if (age < 86400000)  return { label: "Recent",  color: C.yellow };
    return { label: "Offline", color: C.red };
  };

  const save = async () => {
    if (!modal?.id) return;
    await supabase.from("tablets").update({ device_name: modal.device_name, org_id: modal.org_id || null, notes: modal.notes }).eq("id", modal.id);
    setModal(null); load();
  };

  const fmtTime = iso => iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Never";
  const orgName = id => orgs.find(o => o.id === id)?.name || "–";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ color: C.text, fontFamily: sans, fontWeight: 700, margin: 0 }}>Tablets</h2>
        <span style={{ fontSize: 12, color: C.dim }}>Tablets register automatically on first login</span>
      </div>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 160px 120px 140px 80px 70px", padding: "10px 20px", borderBottom: `1px solid ${C.border}`, fontSize: 11, color: C.dim, textTransform: "uppercase", letterSpacing: 0.8 }}>
          <span>Device Name</span><span>MAC Address</span><span>Client</span><span>Last Seen</span><span>Status</span><span></span>
        </div>
        {tablets.length === 0 && <div style={{ padding: 20, color: C.dim, fontSize: 13 }}>No tablets registered yet. Tablets appear here after the first login.</div>}
        {tablets.map(t => {
          const s = tabletStatus(t);
          return (
            <div key={t.id} style={{ display: "grid", gridTemplateColumns: "1fr 160px 120px 140px 80px 70px", padding: "12px 20px", borderBottom: `1px solid ${C.border}`, alignItems: "center" }}>
              <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{t.device_name || t.mac_address}</span>
              <span style={{ fontSize: 11, color: C.dim, fontFamily: mono }}>{t.mac_address}</span>
              <span style={{ fontSize: 12, color: C.dim }}>{orgName(t.org_id)}</span>
              <span style={{ fontSize: 11, color: C.dim }}>{fmtTime(t.last_seen_at)}</span>
              <span style={{ fontSize: 11, color: s.color, fontWeight: 700 }}>{s.label}</span>
              <Btn small variant="secondary" onClick={() => setModal({ ...t })}>Edit</Btn>
            </div>
          );
        })}
      </div>

      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 28, width: 380, fontFamily: mono }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 4 }}>Edit Tablet</div>
            <div style={{ fontSize: 11, color: C.dim, marginBottom: 20, fontFamily: mono }}>{modal.mac_address}</div>
            <Input label="Device Name" value={modal.device_name || ""} onChange={v => setModal(m => ({ ...m, device_name: v }))} />
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: C.dim, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.8 }}>Assign to Client</div>
              <select value={modal.org_id || ""} onChange={e => setModal(m => ({ ...m, org_id: e.target.value }))}
                style={{ width: "100%", padding: "9px 12px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, fontSize: 13, fontFamily: mono }}>
                <option value="">— Unassigned —</option>
                {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
            <Input label="Notes" value={modal.notes || ""} onChange={v => setModal(m => ({ ...m, notes: v }))} />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
              <Btn variant="secondary" onClick={() => setModal(null)}>Cancel</Btn>
              <Btn onClick={save}>Save</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Login History ──────────────────────────────────────────────────────────────
function LoginHistoryView({ supabase }) {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState("");
  const [page, setPage]   = useState(0);
  const PAGE = 50;

  const load = async (p = 0) => {
    let q = supabase.from("login_history").select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(p * PAGE, p * PAGE + PAGE - 1);
    if (filter.trim()) {
      q = q.or(`user_email.ilike.%${filter}%,device_name.ilike.%${filter}%,mac_address.ilike.%${filter}%`);
    }
    const { data } = await q;
    setRows(data || []);
  };

  useEffect(() => { load(page); }, [supabase, page, filter]);

  const fmtTime = iso => iso ? new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "–";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, gap: 12 }}>
        <h2 style={{ color: C.text, fontFamily: sans, fontWeight: 700, margin: 0 }}>Login History</h2>
        <input value={filter} onChange={e => { setFilter(e.target.value); setPage(0); }} placeholder="Search email, device, MAC…"
          style={{ padding: "8px 12px", background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, fontSize: 13, fontFamily: mono, width: 260 }} />
      </div>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr 140px 160px", padding: "10px 20px", borderBottom: `1px solid ${C.border}`, fontSize: 11, color: C.dim, textTransform: "uppercase", letterSpacing: 0.8 }}>
          <span>Event</span><span>User</span><span>Device</span><span>MAC</span><span>Time</span>
        </div>
        {rows.length === 0 && <div style={{ padding: 20, color: C.dim, fontSize: 13 }}>No records found.</div>}
        {rows.map(row => (
          <div key={row.id} style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr 140px 160px", padding: "10px 20px", borderBottom: `1px solid ${C.border}`, alignItems: "center", fontSize: 12 }}>
            <span style={{ color: row.event === "login" ? C.green : C.red, fontWeight: 700 }}>{row.event?.toUpperCase()}</span>
            <span style={{ color: C.text }}>{row.user_name || row.user_email || "–"}</span>
            <span style={{ color: C.dim }}>{row.device_name || "–"}</span>
            <span style={{ color: C.dim, fontFamily: mono, fontSize: 11 }}>{row.mac_address || "–"}</span>
            <span style={{ color: C.dim }}>{fmtTime(row.created_at)}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16 }}>
        {page > 0 && <Btn small variant="secondary" onClick={() => setPage(p => p - 1)}>← Prev</Btn>}
        <span style={{ fontSize: 12, color: C.dim, padding: "6px 12px" }}>Page {page + 1}</span>
        {rows.length === PAGE && <Btn small variant="secondary" onClick={() => setPage(p => p + 1)}>Next →</Btn>}
      </div>
    </div>
  );
}

// ── Template Builder ───────────────────────────────────────────────────────────
function TemplateBuilder({ supabase, template, onDone }) {
  const isNew = !template.id;
  const [name, setName]       = useState(template.name || "");
  const [desc, setDesc]       = useState(template.description || "");
  const [cat, setCat]         = useState(template.category || "custom");
  const [sections, setSections] = useState(
    template.sections?.length
      ? JSON.parse(JSON.stringify(template.sections))
      : [{ id: crypto.randomUUID(), name: "Section 1", repeatable: false, items: [] }]
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState("");

  const addSection = () => setSections(s => [...s, { id: crypto.randomUUID(), name: "New Section", repeatable: false, items: [] }]);
  const removeSection = id => setSections(s => s.filter(x => x.id !== id));
  const updateSection = (id, key, val) => setSections(s => s.map(x => x.id === id ? { ...x, [key]: val } : x));

  const addItem = (secId) => setSections(s => s.map(x => x.id === secId
    ? { ...x, items: [...x.items, { id: crypto.randomUUID(), label: "New Item", type: "passfail" }] }
    : x));
  const removeItem = (secId, itemId) => setSections(s => s.map(x => x.id === secId
    ? { ...x, items: x.items.filter(i => i.id !== itemId) }
    : x));
  const updateItem = (secId, itemId, key, val) => setSections(s => s.map(x => x.id === secId
    ? { ...x, items: x.items.map(i => i.id === itemId ? { ...i, [key]: val } : i) }
    : x));

  const save = async () => {
    if (!name.trim()) { setErr("Name is required."); return; }
    setSaving(true); setErr("");
    const payload = { name, description: desc, category: cat, sections, is_system: false };
    const { error } = isNew
      ? await supabase.from("inspection_templates").insert(payload)
      : await supabase.from("inspection_templates").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", template.id);
    if (error) { setErr(error.message); setSaving(false); return; }
    onDone();
  };

  return (
    <div style={{ maxWidth: 760 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <Btn variant="secondary" small onClick={onDone}>← Back</Btn>
        <h2 style={{ color: C.text, fontFamily: sans, fontWeight: 700, margin: 0 }}>{isNew ? "New Template" : "Edit Template"}</h2>
      </div>
      {err && <div style={{ background: C.red + "22", color: C.red, padding: "10px 14px", borderRadius: 6, marginBottom: 16, fontSize: 13 }}>{err}</div>}

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 20, marginBottom: 20 }}>
        <Input label="Template Name" value={name} onChange={setName} placeholder="e.g. Custom Safety Walkthrough" />
        <Input label="Description" value={desc} onChange={setDesc} placeholder="Brief description of this template" />
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: C.dim, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.8 }}>Category</div>
          <select value={cat} onChange={e => setCat(e.target.value)}
            style={{ padding: "9px 12px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, fontSize: 13, fontFamily: mono }}>
            <option value="residential">Residential</option>
            <option value="automotive">Automotive</option>
            <option value="aviation">Aviation</option>
            <option value="custom">Custom</option>
          </select>
        </div>
      </div>

      {sections.map((sec, si) => (
        <div key={sec.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 20, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <input value={sec.name} onChange={e => updateSection(sec.id, "name", e.target.value)}
              style={{ flex: 1, padding: "8px 12px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, fontSize: 14, fontWeight: 700, fontFamily: mono }} />
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.dim, cursor: "pointer" }}>
              <input type="checkbox" checked={sec.repeatable} onChange={e => updateSection(sec.id, "repeatable", e.target.checked)} />
              Repeatable
            </label>
            {sections.length > 1 && (
              <Btn small variant="danger" onClick={() => removeSection(sec.id)}>Remove</Btn>
            )}
          </div>

          {sec.items.map((item, ii) => (
            <div key={item.id} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <input value={item.label} onChange={e => updateItem(sec.id, item.id, "label", e.target.value)}
                placeholder="Item label"
                style={{ flex: 1, padding: "7px 10px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, fontSize: 13, fontFamily: mono }} />
              <select value={item.type} onChange={e => updateItem(sec.id, item.id, "type", e.target.value)}
                style={{ padding: "7px 10px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, color: C.dim, fontSize: 12, fontFamily: mono }}>
                <option value="condition">Condition</option>
                <option value="passfail">Pass/Fail</option>
                <option value="text">Text</option>
              </select>
              <Btn small variant="danger" onClick={() => removeItem(sec.id, item.id)}>×</Btn>
            </div>
          ))}
          <Btn small variant="secondary" onClick={() => addItem(sec.id)}>+ Add Item</Btn>
        </div>
      ))}

      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <Btn variant="secondary" onClick={addSection}>+ Add Section</Btn>
        <div style={{ flex: 1 }} />
        <Btn variant="secondary" onClick={onDone}>Cancel</Btn>
        <Btn onClick={save}>{saving ? "Saving…" : isNew ? "Create Template" : "Save Changes"}</Btn>
      </div>
    </div>
  );
}

// ── Template Manager ───────────────────────────────────────────────────────────
function TemplateManager({ supabase, onEdit }) {
  const [templates, setTemplates] = useState([]);

  const load = async () => {
    const { data } = await supabase.from("inspection_templates").select("*").order("is_system", { ascending: false }).order("name");
    setTemplates(data || []);
  };
  useEffect(() => { load(); }, [supabase]);

  const del = async (id) => {
    if (!window.confirm("Delete this template?")) return;
    await supabase.from("inspection_templates").delete().eq("id", id);
    load();
  };

  const totalItems = (t) => (t.sections || []).reduce((n, s) => n + (s.items?.length || 0), 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ color: C.text, fontFamily: sans, fontWeight: 700, margin: 0 }}>Templates</h2>
        <Btn onClick={() => onEdit({ sections: [] })}>+ New Template</Btn>
      </div>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 80px 80px 120px", padding: "10px 20px", borderBottom: `1px solid ${C.border}`, fontSize: 11, color: C.dim, textTransform: "uppercase", letterSpacing: 0.8 }}>
          <span>Name</span><span>Category</span><span>Sections</span><span>Items</span><span></span>
        </div>
        {templates.length === 0 && <div style={{ padding: 20, color: C.dim, fontSize: 13 }}>No templates yet.</div>}
        {templates.map(t => (
          <div key={t.id} style={{ display: "grid", gridTemplateColumns: "1fr 120px 80px 80px 120px", padding: "12px 20px", borderBottom: `1px solid ${C.border}`, alignItems: "center" }}>
            <div>
              <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{t.name}</span>
              {t.is_system && <span style={{ marginLeft: 8, fontSize: 10, color: C.dim, background: C.cardAlt, padding: "1px 6px", borderRadius: 10, border: `1px solid ${C.border}` }}>SYSTEM</span>}
              {t.description && <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>{t.description}</div>}
            </div>
            <span><Badge label={t.category || "custom"} color={t.category} /></span>
            <span style={{ fontSize: 13, color: C.dim }}>{(t.sections || []).length}</span>
            <span style={{ fontSize: 13, color: C.dim }}>{totalItems(t)}</span>
            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
              {!t.is_system && <Btn small variant="secondary" onClick={() => onEdit(t)}>Edit</Btn>}
              {t.is_system  && <Btn small variant="secondary" onClick={() => onEdit({ ...t, id: undefined, name: t.name + " (Copy)", is_system: false })}>Duplicate</Btn>}
              {!t.is_system && <Btn small variant="danger" onClick={() => del(t.id)}>Del</Btn>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── IT Terminal (root) ────────────────────────────────────────────────────────
export default function ITTerminal({ profile, supabase, onLogout }) {
  const [itView, setItView]               = useState("dashboard");
  const [editingTemplate, setEditingTemplate] = useState(null);

  useEffect(() => { seedSystemTemplates(supabase); }, [supabase]);

  if (editingTemplate !== null) {
    return (
      <div style={{ display: "flex", minHeight: "100vh", background: C.bg, color: C.text, fontFamily: mono }}>
        <Sidebar view="templates" onNav={v => { setEditingTemplate(null); setItView(v); }} onLogout={onLogout} profile={profile} />
        <main style={{ flex: 1, overflow: "auto", padding: 28 }}>
          <TemplateBuilder supabase={supabase} template={editingTemplate} onDone={() => setEditingTemplate(null)} />
        </main>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg, color: C.text, fontFamily: mono }}>
      <Sidebar view={itView} onNav={setItView} onLogout={onLogout} profile={profile} />
      <main style={{ flex: 1, overflow: "auto", padding: 28 }}>
        {itView === "dashboard" && <ITDashboard  supabase={supabase} />}
        {itView === "clients"   && <ClientManager supabase={supabase} />}
        {itView === "tablets"   && <TabletTracker supabase={supabase} />}
        {itView === "history"   && <LoginHistoryView supabase={supabase} />}
        {itView === "templates" && <TemplateManager supabase={supabase} onEdit={setEditingTemplate} />}
      </main>
    </div>
  );
}
