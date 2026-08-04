export const PROGRAM_PRICES = {
    level1: 2000,
    level2: 2000,
    singapore: 3000,
    silicon_valley: 6000
};


export const PROFILE_LABELS = {
    corporate: "Corporate Innovation & Venture Professional",
    angel: "Angel Investor, HNWI",
    family_office: "Family Office, Businesses",
    aspiring_vc: "Aspiring Investor or Venture Capitalist",
    business_pro: "Business Professional or Strategist"
};


export const formState = {

    currentSlide: 0,

    selectedProfile: null,

    selectedPrograms: new Set(),

    turnstileToken: null

};