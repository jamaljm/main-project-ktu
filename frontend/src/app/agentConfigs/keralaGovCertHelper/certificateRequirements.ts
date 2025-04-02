/**
 * Kerala Government Certificate Requirements
 *
 * This file contains detailed information about the requirements for
 * different certificate types issued by the Kerala government.
 */

export const certificateRequirements = {
  caste: {
    name: "Caste Certificate",
    description: "Official document certifying your caste status",
    requiredDocuments: [
      "Applicant's Aadhaar Card",
      "Ration Card",
      "SSLC/Birth Certificate",
      "Land tax receipt (if available)",
      "Previous caste certificate (if available)",
      "Parent's caste certificate",
      "Relationship certificate (from village officer)",
      "Recent passport-sized photographs (2)",
    ],
    eligibilityNotes: [
      "Applicant must be a permanent resident of Kerala",
      "Caste must be listed in the Kerala State SC/ST/OBC list",
      "For minors, parent's caste certificate is mandatory",
    ],
    processingTime: "7-14 working days",
    fee: "₹100",
    validityPeriod: "Permanent (unless specified otherwise)",
    issuingAuthority: "Village Officer/Tahsildar",
    verificationProcess: "Field verification by Village Officer is required",
    commonIssues: [
      "Discrepancy in name spelling across documents",
      "Missing parent's caste certificates",
      "Incomplete residential proof",
      "Issues with caste name variations",
    ],
  },

  income: {
    name: "Income Certificate",
    description: "Proof of annual income certification",
    requiredDocuments: [
      "Applicant's Aadhaar Card",
      "Ration Card",
      "Employment Certificate (for employed individuals)",
      "Salary Certificate/Payslips (last 3 months)",
      "Bank Statements (last 6 months)",
      "IT Returns (if applicable)",
      "Affidavit of Income (for self-employed)",
      "Recent passport-sized photographs (2)",
    ],
    eligibilityNotes: [
      "Certificate issued based on annual family income",
      "All sources of income must be declared",
      "For agricultural income, land holdings must be declared",
    ],
    processingTime: "5-10 working days",
    fee: "₹100",
    validityPeriod: "1 year from date of issue",
    issuingAuthority: "Village Officer/Tahsildar",
    verificationProcess: "Field verification by Revenue officials",
    commonIssues: [
      "Undeclared income sources",
      "Mismatch between declared income and lifestyle",
      "Missing financial documentation",
      "Outdated information in ration card",
    ],
  },

  domicile: {
    name: "Domicile Certificate",
    description: "Verify your residential status in Kerala",
    requiredDocuments: [
      "Applicant's Aadhaar Card",
      "Ration Card",
      "Electoral ID (Voter ID)",
      "Utility Bills (Electricity/Water bill for proof of residence)",
      "Property Tax Receipt (if own property)",
      "Rental Agreement (if renting)",
      "School/College Certificates (for education in Kerala)",
      "Recent passport-sized photographs (2)",
    ],
    eligibilityNotes: [
      "Minimum continuous residence of 7 years in Kerala required",
      "Birth in Kerala can be supporting evidence",
      "Education in Kerala can be supporting evidence",
    ],
    processingTime: "7-14 working days",
    fee: "₹100",
    validityPeriod: "Permanent (unless specified otherwise)",
    issuingAuthority: "Tahsildar",
    verificationProcess: "Field verification of residence is required",
    commonIssues: [
      "Insufficient proof of continuous residence",
      "Discrepancy in address across documents",
      "Gaps in residential history",
      "Name spelling variations across documents",
    ],
  },

  birth: {
    name: "Birth Certificate",
    description: "Official birth registration certificate",
    requiredDocuments: [
      "Birth report from hospital/medical institution",
      "Parent's Aadhaar Cards",
      "Parent's Marriage Certificate",
      "Affidavit (for delayed registration)",
      "Witness statements (for home births/delayed registration)",
      "School certificate (for delayed registration)",
      "Local authority verification (for delayed registration)",
    ],
    eligibilityNotes: [
      "Registration within 21 days of birth (normal registration)",
      "Registration within 21-30 days requires approval from registrar",
      "Registration after 30 days up to 1 year requires late fee",
      "Registration after 1 year requires court order/magistrate approval",
    ],
    processingTime: "3-7 working days (normal registration)",
    fee: "₹100 (additional fee for late registration)",
    validityPeriod: "Permanent",
    issuingAuthority: "Local Body Registrar (Municipality/Panchayat)",
    verificationProcess:
      "Verification of hospital records or witness statements",
    commonIssues: [
      "Delays in registration requiring additional approvals",
      "Name not included in original registration",
      "Missing hospital documentation",
      "Inconsistencies in parent information",
    ],
    additionalNotes: [
      "Name can be registered within 1 year of birth registration",
      "Name changes/corrections require separate procedure",
    ],
  },

  death: {
    name: "Death Certificate",
    description: "Death registration certification",
    requiredDocuments: [
      "Death report from hospital/medical institution",
      "Deceased's Aadhaar Card",
      "Informant's ID proof (Aadhaar/Voter ID)",
      "Cremation/Burial certificate (if available)",
      "Police report (for unnatural deaths)",
      "Affidavit (for delayed registration)",
      "Witness statements (for delayed registration)",
    ],
    eligibilityNotes: [
      "Registration within 21 days of death (normal registration)",
      "Registration within 21-30 days requires approval from registrar",
      "Registration after 30 days up to 1 year requires late fee",
      "Registration after 1 year requires court order/magistrate approval",
    ],
    processingTime: "3-7 working days (normal registration)",
    fee: "₹100 (additional fee for late registration)",
    validityPeriod: "Permanent",
    issuingAuthority: "Local Body Registrar (Municipality/Panchayat)",
    verificationProcess: "Verification of hospital/medical records",
    commonIssues: [
      "Delays in registration requiring additional approvals",
      "Missing cause of death documentation",
      "Issues with unnatural death documentation",
      "Name spelling discrepancies",
    ],
  },

  marriage: {
    name: "Marriage Certificate",
    description: "Legal marriage registration certificate",
    requiredDocuments: [
      "Application in prescribed form",
      "Birth certificates of both parties",
      "ID proofs of both parties (Aadhaar/Passport)",
      "Residence proof of both parties",
      "Passport-sized photographs of both parties",
      "Witness ID proofs (2-4 witnesses required)",
      "Marriage invitation card (if available)",
      "Marriage photographs",
      "Affidavit of marital status (single/divorced/widowed)",
      "Divorce decree (if applicable)",
      "Death certificate of spouse (if widowed)",
    ],
    eligibilityNotes: [
      "Registration under Hindu Marriage Act (for Hindus, Buddhists, Jains, Sikhs)",
      "Registration under Special Marriage Act (for inter-religious marriages)",
      "Registration under Indian Christian Marriage Act (for Christians)",
      "Minimum age: 21 years for males, 18 years for females",
      "Personal presence of both parties required",
    ],
    processingTime: "15-30 days",
    fee: "₹100 (additional stamp duty charges apply)",
    validityPeriod: "Permanent",
    issuingAuthority: "Marriage Registrar/Sub-Registrar",
    verificationProcess: "In-person verification and witness testimony",
    commonIssues: [
      "Incomplete documentation from either party",
      "Issues with previous marriage dissolution proof",
      "Parental consent issues for borderline ages",
      "Witness availability problems",
    ],
    additionalNotes: [
      "30-day notice period required for Special Marriage Act registrations",
      "Religious marriages can be registered under respective personal laws",
    ],
  },
};


