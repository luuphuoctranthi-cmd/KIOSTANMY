export interface CitizenProfile {
  cccd: string;
  fullName: string;
  dob: string;
  gender: string;
  address: string;
  phoneNumber: string;
  maritalStatus: string;
  nationality: string;
  fatherName?: string;
  motherName?: string;
}

export interface ServiceField {
  id: string;
  label: string;
  type: 'text' | 'date' | 'select' | 'file';
  vneidField?: keyof CitizenProfile; // which field in VneID to link to
  placeholder?: string;
  options?: string[];
  required: boolean;
}

export interface RequiredProofDoc {
  id: string;
  docName: string;
  isRequired: boolean;
  description: string;
  fieldId?: string;
}

export interface PublicService {
  id: string;
  name: string;
  keywords: string[]; // trigger phrases for the voice assistant
  description: string;
  aiGuidelines: string; // pdf content / regulatory instructions
  formTemplateName: string; // original filename uploaded
  feedbackTemplateName: string; // response template filename uploaded
  fields: ServiceField[];
  requiredProofs?: RequiredProofDoc[];
}

export interface ProofAuditItem {
  docId: string;
  requiredDocName: string;
  isRequired: boolean;
  status: 'VALID' | 'MISSING' | 'INAPPROPRIATE';
  uploadedFileName: string;
  fileUrl?: string;
  evaluationNote: string;
}

export interface ProofAuditReport {
  proofScore: number; // 0 to 100%
  overallProofStatus: 'COMPLETE' | 'INCOMPLETE' | 'INVALID';
  summaryText: string;
  items: ProofAuditItem[];
}

export interface Dossier {
  id: string;
  serviceId: string;
  serviceName: string;
  citizenCccd: string;
  citizenName: string;
  submittedAt: string;
  formData: Record<string, string>; // fieldId -> value
  uploadedFiles: { fieldId: string; fileName: string; fileUrl: string }[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  digitalSigned: boolean;
  // For AI Audit output
  aiAuditResult?: {
    overallStatus: 'PASS' | 'WARNING' | 'FAIL';
    message: string;
    fieldChecks: {
      fieldId: string;
      label: string;
      submittedValue: string;
      databaseValue: string;
      isMatch: boolean;
      remarks: string;
    }[];
    proofAudit?: ProofAuditReport;
  };
  // Officer response details
  officerResponse?: {
    responseText: string;
    responseFile?: string;
    approvedAt: string;
    officerSignatureId?: string;
    decisionNumber?: string;
    signerName?: string;
    signerTitle?: string;
    customData?: Record<string, string>;
    hasRedSeal?: boolean;
    hasSignature?: boolean;
  };
  rejectionReason?: string;
  rejectionInstructions?: string;
  isReceived?: boolean;
  receivedAt?: string;
  feedback?: {
    rating: 'VERY_SATISFIED' | 'SATISFIED' | 'NEUTRAL' | 'DISSATISFIED' | 'VERY_DISSATISFIED';
    comments?: string;
    submittedAt: string;
    isSentToLeader?: boolean;
  };
}

export interface DigitalSignature {
  id: string;
  ownerCccd: string;
  ownerName: string;
  role: 'CITIZEN' | 'OFFICER';
  keyName: string;
  fileUrl?: string;
  linkedUrl?: string;
}

export interface AccessAuditLog {
  id: string;
  timestamp: string;
  actorCccdOrId: string;
  actorName: string;
  actorRole: 'CITIZEN' | 'OFFICER' | 'SYSTEM';
  action: 'TRA_CUU_CSDL' | 'DONG_BO_VNEID' | 'NOP_HO_SO' | 'PHE_DUYET_HO_SO' | 'TU_CHUOI_HO_SO' | 'CAP_NHAT_CSDL' | 'XOA_BAN_GHI';
  targetCccd?: string;
  targetName?: string;
  ipAddress: string;
  details: string;
  securityLevel: 'NORMAL' | 'SENSITIVE' | 'WARNING' | 'CRITICAL';
}

export interface LegalMarriageValidation {
  isValid: boolean;
  husbandAge: number;
  wifeAge: number;
  husbandEligible: boolean;
  wifeEligible: boolean;
  samePersonConflict: boolean;
  husbandMaritalConflict: boolean;
  wifeMaritalConflict: boolean;
  bloodlineConflict: boolean;
  messages: string[];
}

export interface VneIDNotification {
  id: string;
  citizenCccd: string;
  title: string;
  content: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  dossierId: string;
  downloadUrl?: string;
}
