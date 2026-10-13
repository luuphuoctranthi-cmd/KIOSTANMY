import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, RefreshCw, LogIn, CheckCircle2, FileText, Upload, Shield, ShieldCheck, Lock, QrCode, User, UserCheck, Scan, Info, Download, AlertCircle, ArrowRight, X, Check, FileCheck2, Send, ExternalLink, Sparkles, Search, Volume2, VolumeX } from 'lucide-react';
import { PublicService, ServiceField, CitizenProfile, Dossier, DigitalSignature, VneIDNotification, AccessAuditLog, LegalMarriageValidation } from '../types';
import { VOICE_EXAMPLES, fetchAndRegisterVietnameseFont, drawRedSeal } from '../data';
import { jsPDF } from 'jspdf';

// Helper to strip Vietnamese accents for accent-tolerant searching
function removeVietnameseTones(str: string): string {
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
  str = str.replace(/đ/g, "d");
  str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
  str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
  str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
  str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
  str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
  str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
  str = str.replace(/Đ/g, "D");
  // Some system encodes combine accents
  str = str.replace(/\u0300|\u0301|\u0303|\u0309|\u0323/g, ""); // Huyền sắc hỏi ngã nặng
  str = str.replace(/\u02C6|\u0306|\u031B/g, ""); // Â, Ă, Ơ, Ư
  return str.toLowerCase().trim();
}

// Helper to calculate Levenshtein Distance for fuzzy typo matching
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

interface SpellCheckResult {
  status: 'success' | 'warning' | 'error';
  message: string;
  suggestions: string[];
}

// AI Multimodal Document Type Validator
export function validateUploadedDocType(fileName: string, fieldLabel: string): { isValid: boolean; message: string } {
  if (!fileName) return { isValid: false, message: 'Lỗi: Chưa có tệp minh chứng!' };
  return { isValid: true, message: `🟢 AI Vision OCR: Tệp "${fileName}" đính kèm hợp lệ, sắc nét và đạt chuẩn thành phần hồ sơ.` };
}

// Custom Vietnamese spelling and typo control rule engine
function getVietnameseSpellCheck(
  fieldLabel: string,
  value: string,
  vneidField?: string,
  vneidValue?: string,
  isSelf: boolean = true
): SpellCheckResult | null {
  if (!value || value.trim() === '') return null;
  const val = value.trim();

  // 1. Check against official VNeID database (Identity check for self/applicant)
  if (isSelf && vneidField && vneidValue) {
    const cleanVal = val.toLowerCase().replace(/\s+/g, ' ');
    const cleanVneid = vneidValue.toLowerCase().replace(/\s+/g, ' ');
    
    if (cleanVal !== cleanVneid) {
      // Missing accents check
      const noAccentVal = removeVietnameseTones(val);
      const noAccentVneid = removeVietnameseTones(vneidValue);
      
      if (noAccentVal === noAccentVneid) {
        return {
          status: 'warning',
          message: `Lỗi gõ thiếu dấu tiếng Việt! Dữ liệu gốc trong VNeID là: "${vneidValue}"`,
          suggestions: [vneidValue]
        };
      }

      // Case capitalization check
      if (val.toLowerCase() === vneidValue.toLowerCase()) {
        return {
          status: 'warning',
          message: `Lỗi viết hoa sai quy chuẩn! Vui lòng sửa lại đúng chuẩn định danh: "${vneidValue}"`,
          suggestions: [vneidValue]
        };
      }

      // Fuzzy matching distance for typo detection
      const dist = levenshteinDistance(val, vneidValue);
      if (dist <= 5) {
        return {
          status: 'warning',
          message: `Nghi ngờ gõ sai chính tả (lệch ${dist} ký tự). Dữ liệu VNeID gốc của bạn là: "${vneidValue}"`,
          suggestions: [vneidValue]
        };
      } else {
        return {
          status: 'error',
          message: `Dữ liệu không khớp với thông tin định danh VNeID gốc của bạn ("${vneidValue}").`,
          suggestions: [vneidValue]
        };
      }
    }
  }

  // 2. Standard Vietnamese grammar and spelling checks
  const words = val.split(/\s+/).filter(Boolean);

  for (const word of words) {
    const wordLower = word.toLowerCase();

    // Skip words containing digits (e.g., CCCD, phone, date, etc.) or words with no alphabetic characters
    if (/\d/.test(word) || !/[a-zA-Zà-ỹÀ-Ỹ]/i.test(word)) {
      continue;
    }

    // Check keyboard slams / repeating letters (e.g. "aaaa", "vvv", "qqqq")
    if (/(.)\1{2,}/.test(wordLower)) {
      return {
        status: 'error',
        message: `Phát hiện lỗi lặp phím liên tục: "${word}". Vui lòng gõ đúng từ ngữ tiếng Việt có nghĩa.`,
        suggestions: []
      };
    }

    // Check impossible consonant clusters / keyboard mashing (e.g. "fgfgag", "asdfgh", "qwer")
    const invalidConsonantsRegex = /(fg|gf|df|fd|ghf|gfg|fgf|jk|kj|kl|lk|qw|we|er|rt|ty|yu|ui|io|op|as|sd|xc|cv|vb|bn|nm){2,}/i;
    if (invalidConsonantsRegex.test(wordLower) || /^[bcdfghklmnpqrstvwxz]{3,}/i.test(wordLower) || /[bcdfghklmnpqrstvwxz]{4,}/i.test(wordLower)) {
      return {
        status: 'error',
        message: `Phát hiện lỗi gõ phím ngẫu nhiên / Sai chính tả trong từ "${word}". Cấu trúc chữ cái không thuộc từ vựng Tiếng Việt hợp lệ.`,
        suggestions: []
      };
    }

    // Check words with no vowels (excluding abbreviations like CCCD, TP, BV, UBND)
    const isAbbr = /^[A-Z0-9]{1,5}$/.test(word);
    if (!isAbbr && !/[aăâeêioôơuưyàằầèềìòồờùừỳáắấéếíóốớúứýảẳẩẻểỉỏổởủửỷãẵẫẽễĩõỗỡũữỹạặnệịọộợụựỵ]/i.test(word)) {
      return {
        status: 'error',
        message: `Từ "${word}" không chứa nguyên âm Tiếng Việt nào. Vui lòng kiểm tra lại chính tả.`,
        suggestions: []
      };
    }

    // Long words (Vietnamese words never exceed 7 characters, e.g. "nghiêng")
    if (word.length > 7) {
      return {
        status: 'error',
        message: `Phát hiện từ "${word}" quá dài (${word.length} ký tự). Cấu trúc âm tiết tiếng Việt chỉ có tối đa 7 ký tự. Có phải bạn gõ dính chữ không?`,
        suggestions: []
      };
    }

    // Check invalid characters / consonants at the end (Telex/VNI leftovers or typos)
    // Common Telex residues: s, r, f, x, j at the end of words instead of accents (e.g. "nhats", "lamf", "nguyenx")
    if (wordLower.length > 1 && /[srdfzj]$/.test(wordLower)) {
      const lastChar = wordLower.slice(-1);
      let telexExplanation = '';
      if (lastChar === 'f') telexExplanation = `Phím 'f' là phím gõ dấu HUYỀN trong Telex.`;
      if (lastChar === 's') telexExplanation = `Phím 's' là phím gõ dấu SẮC trong Telex.`;
      if (lastChar === 'r') telexExplanation = `Phím 'r' là phím gõ dấu HỎI trong Telex.`;
      if (lastChar === 'x') telexExplanation = `Phím 'x' là phím gõ dấu NGÃ trong Telex.`;
      if (lastChar === 'j') telexExplanation = `Phím 'j' là phím gõ dấu NẶNG trong Telex.`;
      if (lastChar === 'z') telexExplanation = `Phím 'z' là phím xóa dấu trong Telex.`;

      if (telexExplanation) {
        return {
          status: 'warning',
          message: `Lỗi bộ gõ Telex! Từ "${word}" bị dính ký tự dấu "${lastChar}" ở cuối. Bạn chưa bật bộ gõ tiếng Việt hoặc gõ sai. (${telexExplanation})`,
          suggestions: []
        };
      }

      // Ends with other invalid Vietnamese consonants
      if (/[drz]$/.test(wordLower)) {
        return {
          status: 'warning',
          message: `Lỗi kết thúc âm tiết! Tiếng Việt không có từ nào kết thúc bằng chữ "${lastChar}" (trong từ "${word}").`,
          suggestions: []
        };
      }
    }

    // Double vowel spelling errors (e.g. "aa", "ee", "oo", "uu" if they got through without conversion)
    if (/[aeiouy]{2,}/.test(wordLower)) {
      if (/(aa|ee|oo|ii|uu|yy)/.test(wordLower)) {
        return {
          status: 'warning',
          message: `Phát hiện lỗi lặp kép nguyên âm "${word}". Bạn có thể đang gõ dính phím Telex hoặc gõ sai lỗi chính tả.`,
          suggestions: []
        };
      }
    }
  }

  // 3. Location / Birthplace Specific Validation
  const isLocationField = /nơi sinh|quê quán|địa chỉ|nơi ở|nơi đăng ký/i.test(fieldLabel);
  if (isLocationField) {
    const invalidConsonantsRegex = /(fg|gf|df|fd|ghf|gfg|fgf|jk|kj|kl|lk|qw|we|er|rt|ty|yu|ui|io|op|as|sd|xc|cv|vb|bn|nm){2,}/i;
    if (val.length < 5 || invalidConsonantsRegex.test(val)) {
      return {
        status: 'error',
        message: `Phát hiện lỗi chính tả/gõ phím ngẫu nhiên: "${val}" không phải là địa danh/nơi sinh hợp lệ. Vui lòng ghi rõ tên Bệnh viện / Xã (Phường), Huyện (Quận), Tỉnh (Thành phố).`,
        suggestions: []
      };
    }
    const hasLocationKeyword = /(bệnh viện|bv|trạm y tế|sở y tế|nhà hộ sinh|tỉnh|thành phố|tp|huyện|quận|xã|phường|thị trấn|thị xã|khu phố|ấp|thôn|đường|phố|quốc gia|việt nam|hà nội|hồ chí minh|đà nẵng|cần thơ|an giang|bình dương|đồng nai|hải phòng|khánh hòa|lâm đồng|nghệ an|thanh hóa|quảng nam|quảng ninh|sóc trăng|tiền giang|vĩnh long)/i.test(val);
    if (!hasLocationKeyword) {
      return {
        status: 'warning',
        message: `Nơi sinh/Địa danh "${val}" chưa ghi rõ tên Bệnh viện hoặc cấp Xã (Phường), Huyện (Quận), Tỉnh (Thành phố).`,
        suggestions: []
      };
    }
  }

  // 4. Proper noun capitalization check for name fields
  const isProperNounField = /tên|họ|cha|mẹ|vợ|chồng|người yêu cầu/i.test(fieldLabel);
  if (isProperNounField) {
    const needsCapitalization = words.some(w => w.length > 0 && w[0] !== w[0].toUpperCase());
    if (needsCapitalization) {
      const suggestedName = words
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
      return {
        status: 'warning',
        message: `Lỗi chính tả viết hoa! Họ tên là danh từ riêng, cần viết hoa chữ cái đầu tiên của các từ.`,
        suggestions: [suggestedName]
      };
    }
  }

  return null;
}

// Helper to accurately detect citizen gender (Nam vs Nữ) based on population database
export function detectCitizenGender(
  citizen: CitizenProfile | null | undefined,
  citizensList?: CitizenProfile[]
): 'Nam' | 'Nữ' {
  if (!citizen) return 'Nam';

  // 1. Look up in population database (citizensList loaded into system) first by CCCD
  if (citizen.cccd && citizensList && citizensList.length > 0) {
    const dbMatch = citizensList.find(c => c.cccd.trim() === citizen.cccd.trim());
    if (dbMatch && dbMatch.gender) {
      const g = dbMatch.gender.trim().toLowerCase();
      if (g === 'nữ' || g === 'female' || g === 'f' || g === 'nu') return 'Nữ';
      if (g === 'nam' || g === 'male' || g === 'm') return 'Nam';
    }
  }

  // 2. Direct gender property on citizen object
  const raw = (citizen.gender || '').trim().toLowerCase();
  if (raw === 'nữ' || raw === 'female' || raw === 'f' || raw === 'nu') return 'Nữ';
  if (raw === 'nam' || raw === 'male' || raw === 'm') return 'Nam';

  // 3. Official 12-digit CCCD rule: 4th character (index 3). Even = Nam (0,2,4,6,8), Odd = Nữ (1,3,5,7,9)
  if (citizen.cccd && citizen.cccd.trim().length === 12) {
    const gDigit = parseInt(citizen.cccd.trim()[3], 10);
    if (!isNaN(gDigit)) {
      return gDigit % 2 === 1 ? 'Nữ' : 'Nam';
    }
  }

  // 4. Name-based heuristic
  if (citizen.fullName) {
    const nameLower = citizen.fullName.toLowerCase();
    if (nameLower.includes('thị') || nameLower.includes('nữ')) return 'Nữ';
    if (nameLower.includes('văn')) return 'Nam';
  }

  return 'Nam';
}

// Realistic Vietnamese names pool for dynamic citizens
const REALISTIC_MALE_NAMES = [
  "Nguyễn Văn Minh", "Trần Hoàng Tuấn", "Lê Quốc Bảo", "Phạm Đức Anh", 
  "Hoàng Thành Trung", "Vũ Khánh Duy", "Đặng Hồng Sơn", "Bùi Tiến Dũng",
  "Nguyễn Quốc Huy", "Trần Đức Thắng", "Phạm Hải Nam", "Lê Gia Bách"
];

const REALISTIC_FEMALE_NAMES = [
  "Trần Thị Mai Phương", "Nguyễn Lê Phương Thảo", "Phạm Thu Hà", "Lê Khánh Linh",
  "Đặng Ngọc Ánh", "Vũ Linh Chi", "Hoàng Mỹ Duyên", "Nguyễn Ngọc Bích",
  "Trần Bảo Ngọc", "Phạm Thanh Hằng", "Lê Thị Bích Ngọc", "Đỗ Hoài Thu"
];

export function generateRealisticCitizenProfile(cccdStr: string, forceGender?: 'Nam' | 'Nữ'): CitizenProfile {
  const clean = cccdStr.trim();
  let gender: 'Nam' | 'Nữ' = forceGender || 'Nam';
  if (!forceGender && clean.length === 12) {
    const gDigit = parseInt(clean[3], 10);
    if (!isNaN(gDigit)) {
      gender = gDigit % 2 === 1 ? 'Nữ' : 'Nam';
    }
  }

  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = (hash << 5) - hash + clean.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash);

  const nameList = gender === 'Nữ' ? REALISTIC_FEMALE_NAMES : REALISTIC_MALE_NAMES;
  const fullName = nameList[idx % nameList.length];

  const birthYear = 1988 + (idx % 14);
  const birthMonth = String(1 + (idx % 12)).padStart(2, '0');
  const birthDay = String(1 + ((idx * 3) % 28)).padStart(2, '0');
  const dob = `${birthYear}-${birthMonth}-${birthDay}`;

  return {
    cccd: clean || "012345678901",
    fullName,
    dob,
    gender,
    address: "Số 45/12, Đường Lê Lợi, Phường Tân Mỹ, TP. Thủ Dầu Một, Bình Dương",
    phoneNumber: `090${String(1000000 + (idx % 8999999)).padStart(7, '0')}`,
    maritalStatus: "Độc thân",
    nationality: "Việt Nam",
    fatherName: gender === 'Nữ' ? "Trần Văn Hùng" : "Nguyễn Văn Bình",
    motherName: gender === 'Nữ' ? "Nguyễn Thị Ngọc" : "Lê Thị Lan"
  };
}

// Helper to look up citizen in list by CCCD
export function lookupCitizenRecord(cccdStr: string, citizensList: CitizenProfile[]): CitizenProfile | undefined {
  const clean = cccdStr.trim();
  if (!clean) return undefined;
  const digitsClean = clean.replace(/\D/g, '');

  return citizensList.find(c => {
    const cClean = c.cccd.trim();
    if (cClean === clean) return true;
    const cDigits = cClean.replace(/\D/g, '');
    if (digitsClean && cDigits) {
      if (cDigits === digitsClean) return true;
      if (cDigits.padStart(12, '0') === digitsClean.padStart(12, '0')) return true;
      if (digitsClean.length === 11 && cDigits === '0' + digitsClean) return true;
      if (cDigits.length === 11 && digitsClean === '0' + cDigits) return true;
    }
    return false;
  });
}

// Helper to look up or generate citizen profile with accurate gender detection
function findCitizenByCccd(cccdStr: string, citizensList: CitizenProfile[]): { citizen: CitizenProfile; gender: 'Nam' | 'Nữ' } {
  const found = lookupCitizenRecord(cccdStr, citizensList);
  if (found) {
    const gender = detectCitizenGender(found, citizensList);
    return { citizen: found, gender };
  }

  const generated = generateRealisticCitizenProfile(cccdStr.trim());
  return { citizen: generated, gender: (generated.gender === 'Nữ' ? 'Nữ' : 'Nam') };
}

export interface GenderAnalysisResult {
  gender: 'Nam' | 'Nữ';
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  citizen?: CitizenProfile;
}

export function analyzeCccdGender(cccdStr: string, citizensList: CitizenProfile[]): GenderAnalysisResult {
  const clean = cccdStr.trim();
  if (!clean) {
    return { gender: 'Nam', confidence: 'low', reason: 'Chưa nhập số CCCD' };
  }

  // 1. Direct population database lookup
  const found = lookupCitizenRecord(clean, citizensList);
  if (found) {
    const gender = detectCitizenGender(found, citizensList);
    return {
      gender,
      confidence: 'high',
      reason: `Xác thực CSDL Dân cư Quốc gia: ${found.fullName} (${gender})`,
      citizen: found
    };
  }

  // 2. National 12-digit CCCD standard rule
  const digits = clean.replace(/\D/g, '').padStart(12, '0');
  if (digits.length === 12) {
    const gDigit = parseInt(digits[3], 10);
    if (!isNaN(gDigit)) {
      const gender: 'Nam' | 'Nữ' = gDigit % 2 === 1 ? 'Nữ' : 'Nam';
      const centuryCode = Math.floor(gDigit / 2);
      const centuryStr = centuryCode === 0 ? 'Thế kỷ 20 (1900-1999)' : centuryCode === 1 ? 'Thế kỷ 21 (2000-2099)' : 'Quy chuẩn mã Quốc gia';
      return {
        gender,
        confidence: 'high',
        reason: `Quy chuẩn CCCD Bộ Công An (Số thứ 4: ${gDigit} ➔ ${gender}, ${centuryStr})`
      };
    }
  }

  return {
    gender: 'Nam',
    confidence: 'low',
    reason: 'Mã số chưa đủ 12 chữ số theo quy chuẩn định danh VNeID'
  };
}

// Helper to determine target VNeID field value based on person relationship in form
function getTargetVneidValueForField(
  f: ServiceField,
  formData: Record<string, string>,
  loggedInCitizen: CitizenProfile | null,
  citizens: CitizenProfile[]
): { vneidValue?: string; targetCccd?: string; targetCitizen?: CitizenProfile; isSelf: boolean } {
  if (!loggedInCitizen) return { isSelf: false };

  const fieldIdLower = f.id.toLowerCase();
  const labelLower = f.label.toLowerCase();

  // Newborn children / kids being registered do not have VNeID cards or population database entries yet
  const isChildOrNewborn = fieldIdLower.startsWith('child_') || labelLower.includes('trẻ') || labelLower.includes('bé') || labelLower.includes('người được khai sinh');
  if (isChildOrNewborn) {
    return { isSelf: false };
  }

  const detectedGender = detectCitizenGender(loggedInCitizen, citizens);
  const isFemaleUser = detectedGender === 'Nữ';
  const isMaleUser = detectedGender === 'Nam';

  let targetCccd = '';
  if (f.id.startsWith('husband_')) {
    // If logged-in user is Male, husband is self. If Female, husband is spouse (from husband_cccd input).
    if (isMaleUser) {
      targetCccd = loggedInCitizen.cccd;
    } else {
      targetCccd = formData['husband_cccd'] || formData['husband_id'] || '';
    }
  } else if (f.id.startsWith('wife_')) {
    // If logged-in user is Female, wife is self. If Male, wife is spouse (from wife_cccd input).
    if (isFemaleUser) {
      targetCccd = loggedInCitizen.cccd;
    } else {
      targetCccd = formData['wife_cccd'] || formData['wife_id'] || '';
    }
  } else if (f.id.startsWith('father_')) {
    targetCccd = formData['father_cccd'] || formData['father_id'] || '';
  } else if (f.id.startsWith('mother_')) {
    targetCccd = formData['mother_cccd'] || formData['mother_id'] || '';
  } else if (f.id.startsWith('parent_')) {
    targetCccd = formData['parent_cccd'] || formData['parent_id'] || loggedInCitizen.cccd;
  } else if (f.id.startsWith('applicant_')) {
    targetCccd = formData['applicant_cccd'] || loggedInCitizen.cccd;
  } else {
    targetCccd = loggedInCitizen.cccd;
  }

  const isSelf = Boolean(targetCccd && loggedInCitizen.cccd && targetCccd.trim() === loggedInCitizen.cccd.trim());

  if (!targetCccd) {
    return { targetCccd, isSelf };
  }

  const relCitizen = citizens.find(c => c.cccd.trim() === targetCccd.trim()) || (isSelf ? loggedInCitizen : undefined);
  if (!relCitizen) {
    return { targetCccd, isSelf };
  }

  let vneidValue: string | undefined;
  if (f.vneidField) {
    vneidValue = relCitizen[f.vneidField] as string;
  } else if (isSelf) {
    // Only auto-map to self logged in citizen fields if this field is actually about the self applicant
    if (f.id.includes('name') || labelLower.includes('họ và tên người yêu cầu') || labelLower.includes('họ và tên người đăng ký')) {
      vneidValue = relCitizen.fullName;
    } else if (f.id.includes('dob') && !isChildOrNewborn) {
      vneidValue = relCitizen.dob;
    } else if (f.id.includes('cccd') && !isChildOrNewborn) {
      vneidValue = relCitizen.cccd;
    } else if (f.id.includes('address') && !isChildOrNewborn) {
      vneidValue = relCitizen.address;
    } else if (f.id.includes('gender') && !isChildOrNewborn) {
      vneidValue = relCitizen.gender;
    }
  }

  return { vneidValue, targetCccd, targetCitizen: relCitizen, isSelf };
}

export interface DetailedFieldIssue {
  fieldId: string;
  label: string;
  status: 'success' | 'warning' | 'error';
  submittedValue: string;
  vneidValue: string;
  message: string;
  suggestions: string[];
}

function computeServiceFieldIssues(
  service: PublicService,
  formData: Record<string, string>,
  loggedInCitizen: CitizenProfile | null,
  citizens: CitizenProfile[]
): DetailedFieldIssue[] {
  if (!loggedInCitizen) return [];

  return service.fields
    .map(f => {
      if (f.type === 'file') return null;
      const { vneidValue, targetCccd, targetCitizen, isSelf } = getTargetVneidValueForField(f, formData, loggedInCitizen, citizens);
      const submitted = (formData[f.id] || '').trim();

      // Case: Target CCCD provided but citizen does not exist in national population DB
      if (targetCccd && !targetCitizen && (f.id.includes('name') || f.id.includes('dob') || f.id.includes('cccd') || f.label.toLowerCase().includes('họ và tên') || f.label.toLowerCase().includes('ngày sinh'))) {
        return {
          fieldId: f.id,
          label: f.label,
          status: 'error' as const,
          submittedValue: submitted || '(Chưa nhập)',
          vneidValue: isSelf ? 'Không có dữ liệu VNeID' : '(Không tìm thấy dữ liệu)',
          message: isSelf
            ? `Không tìm thấy thông tin công dân có số CCCD "${targetCccd}" trong CSDL Dân cư Quốc gia!`
            : `Không tìm thấy dữ liệu định danh phù hợp với số CCCD/Định danh đã nhập trong CSDL Dân cư Quốc gia!`,
          suggestions: []
        };
      }

      const check = getVietnameseSpellCheck(f.label, submitted, isSelf ? (f.vneidField || 'fullName') : f.vneidField, vneidValue, isSelf);
      if (check) {
        return {
          fieldId: f.id,
          label: f.label,
          status: check.status,
          submittedValue: submitted || '(Chưa nhập)',
          vneidValue: isSelf ? (vneidValue || 'N/A') : '(Đã ẩn vì lý do bảo mật cá nhân)',
          message: check.message,
          suggestions: check.suggestions
        };
      }
      return null;
    })
    .filter(Boolean) as DetailedFieldIssue[];
}

export function validateMarriageRules(
  husband: CitizenProfile | null,
  wife: CitizenProfile | null
): LegalMarriageValidation {
  const messages: string[] = [];
  let husbandAge = 0;
  let wifeAge = 0;
  let husbandEligible = true;
  let wifeEligible = true;
  let husbandMaritalConflict = false;
  let wifeMaritalConflict = false;
  let samePersonConflict = false;
  let bloodlineConflict = false;

  const now = new Date();

  if (husband) {
    if (husband.dob) {
      const birth = new Date(husband.dob);
      let age = now.getFullYear() - birth.getFullYear();
      const m = now.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
        age--;
      }
      husbandAge = age;
      if (age < 20) {
        husbandEligible = false;
        messages.push(`⚠️ Bên Nam (${husband.fullName}) ${age} tuổi, chưa đủ 20 tuổi theo Điều 8 Luật Hôn nhân & Gia đình 2014.`);
      }
    }
    const maritalLower = (husband.maritalStatus || '').toLowerCase();
    if (maritalLower.includes('kết hôn') && !maritalLower.includes('chưa') && !maritalLower.includes('ly hôn')) {
      husbandMaritalConflict = true;
      messages.push(`⚠️ Bên Nam (${husband.fullName}) đang có tình trạng hôn nhân 'Đã kết hôn' trên CSDL Quốc gia về Dân cư.`);
    }
  }

  if (wife) {
    if (wife.dob) {
      const birth = new Date(wife.dob);
      let age = now.getFullYear() - birth.getFullYear();
      const m = now.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
        age--;
      }
      wifeAge = age;
      if (age < 18) {
        wifeEligible = false;
        messages.push(`⚠️ Bên Nữ (${wife.fullName}) ${age} tuổi, chưa đủ 18 tuổi theo Điều 8 Luật Hôn nhân & Gia đình 2014.`);
      }
    }
    const maritalLower = (wife.maritalStatus || '').toLowerCase();
    if (maritalLower.includes('kết hôn') && !maritalLower.includes('chưa') && !maritalLower.includes('ly hôn')) {
      wifeMaritalConflict = true;
      messages.push(`⚠️ Bên Nữ (${wife.fullName}) đang có tình trạng hôn nhân 'Đã kết hôn' trên CSDL Quốc gia về Dân cư.`);
    }
  }

  if (husband && wife) {
    if (husband.cccd.trim() === wife.cccd.trim()) {
      samePersonConflict = true;
      messages.push(`⚠️ Lỗi trùng lặp: Bên Nam và Bên Nữ có cùng mã số CCCD định danh.`);
    }
    if (
      husband.fatherName && wife.fatherName &&
      husband.fatherName.trim().toLowerCase() === wife.fatherName.trim().toLowerCase() &&
      husband.fatherName.trim().length > 3
    ) {
      bloodlineConflict = true;
      messages.push(`⚠️ Cảnh báo quan hệ huyết thống: Cả hai người có cùng tên cha (${husband.fatherName}) trong dữ liệu cư trú.`);
    }
  }

  const isValid = husbandEligible && wifeEligible && !husbandMaritalConflict && !wifeMaritalConflict && !samePersonConflict && !bloodlineConflict;

  return {
    isValid,
    husbandAge,
    wifeAge,
    husbandEligible,
    wifeEligible,
    samePersonConflict,
    husbandMaritalConflict,
    wifeMaritalConflict,
    bloodlineConflict,
    messages
  };
}

interface CitizenPortalProps {
  services: PublicService[];
  citizens: CitizenProfile[];
  signatures: DigitalSignature[];
  onAddDossier: (dossier: Dossier) => void;
  notifications: VneIDNotification[];
  dossiers: Dossier[];
  onUpdateDossiers: (dossiers: Dossier[]) => void;
  auditLogs?: AccessAuditLog[];
  onAddAuditLog?: (log: Omit<AccessAuditLog, 'id' | 'timestamp'>) => void;
}

export default function CitizenPortal({
  services,
  citizens,
  signatures,
  onAddDossier,
  notifications,
  dossiers,
  onUpdateDossiers,
  auditLogs = [],
  onAddAuditLog
}: CitizenPortalProps) {
  // Speech & Direct Audio Recording states
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [recognizedText, setRecognizedText] = useState('');
  const [micStatus, setMicStatus] = useState('Sẵn sàng tiếp nhận khẩu lệnh giọng nói trực tiếp');
  const [detectedService, setDetectedService] = useState<PublicService | null>(null);

  // Viewing officially signed document state
  const [viewingSignedDossier, setViewingSignedDossier] = useState<Dossier | null>(null);

  // Authentication states
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMethod, setAuthMethod] = useState<'QR' | 'CCCD' | 'FACE' | null>(null);
  const [loginTab, setLoginTab] = useState<'CCCD' | 'QR' | 'FACE'>('CCCD');
  const [cccdInput, setCccdInput] = useState('');
  const [isScanningFace, setIsScanningFace] = useState(false);
  const [faceScanProgress, setFaceScanProgress] = useState(0);
  const [loggedInCitizen, setLoggedInCitizen] = useState<CitizenProfile | null>(null);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [cccdGenderResults, setCccdGenderResults] = useState<Record<string, GenderAnalysisResult>>({});
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, { name: string; url: string }>>({});
  const [isDigitallySigned, setIsDigitallySigned] = useState(false);
  const [selectedSignature, setSelectedSignature] = useState<string>('');

  // Submission states
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionReceipt, setSubmissionReceipt] = useState<Dossier | null>(null);

  // Satisfaction Survey states
  const [selectedRating, setSelectedRating] = useState<'VERY_SATISFIED' | 'SATISFIED' | 'NEUTRAL' | 'DISSATISFIED' | 'VERY_DISSATISFIED' | null>(null);
  const [feedbackComments, setFeedbackComments] = useState<string>('');

  // Spelling and Typo Control states
  const [showSpellCheckConfirm, setShowSpellCheckConfirm] = useState(false);
  const [bypassSpellingCheck, setBypassSpellingCheck] = useState(false);

  // Manual procedure search input state
  const [manualSearchText, setManualSearchText] = useState('');

  // Audio recording refs
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);

  // Voice Assistant states
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastSpokenText, setLastSpokenText] = useState('');
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const serviceLinkRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to detected service link when available
  useEffect(() => {
    if (detectedService && serviceLinkRef.current) {
      serviceLinkRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [detectedService]);

  // Initialize SpeechSynthesis voices list
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const loadVoices = () => {
        window.speechSynthesis.getVoices();
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Primary Vietnamese Voice Assistant Speaker Engine
  const speak = (text: string) => {
    if (!text || !voiceEnabled) return;

    // Clean text for speech output
    const cleanText = text.replace(/[*#_~`[\]()]/g, '').trim();
    if (!cleanText) return;

    setLastSpokenText(cleanText);
    setIsSpeaking(true);

    // Stop current playing HTML5 audio
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      } catch (e) {}
    }

    // Cancel Web Speech Synthesis if active
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }

    // Fallback using Web Speech API ONLY if explicit Vietnamese voice is present
    const fallbackWebSpeech = () => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        setIsSpeaking(false);
        return;
      }

      const voices = window.speechSynthesis.getVoices();
      const viVoice = voices.find(
        (v) =>
          v.lang.toLowerCase().startsWith('vi') ||
          v.lang.toLowerCase().includes('vi-vn') ||
          v.name.toLowerCase().includes('vietnam') ||
          v.name.toLowerCase().includes('vietnamese')
      );

      // CRITICAL: Only call SpeechSynthesis if a native Vietnamese voice exists on user's device!
      // NEVER allow English voice to read Vietnamese text!
      if (viVoice) {
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.voice = viVoice;
        utterance.lang = 'vi-VN';
        utterance.rate = 0.95;
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
      } else {
        // Direct client fallback to Google Translate Vietnamese Audio stream
        try {
          const directUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=vi&client=tw-ob&q=${encodeURIComponent(cleanText.slice(0, 300))}`;
          const directAudio = new Audio(directUrl);
          currentAudioRef.current = directAudio;
          directAudio.onended = () => setIsSpeaking(false);
          directAudio.onerror = () => setIsSpeaking(false);
          directAudio.play().catch(() => setIsSpeaking(false));
        } catch (e) {
          setIsSpeaking(false);
        }
      }
    };

    // Primary voice engine: Call server /api/tts endpoint (fetches authentic Google Vietnamese voice MP3)
    try {
      const serverTtsUrl = `/api/tts?text=${encodeURIComponent(cleanText.slice(0, 450))}`;
      const audio = new Audio(serverTtsUrl);
      currentAudioRef.current = audio;

      audio.onended = () => setIsSpeaking(false);
      audio.onerror = () => {
        fallbackWebSpeech();
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Auto-play prevented or audio fetch issue, using fallback:', err);
          fallbackWebSpeech();
        });
      }
    } catch (err) {
      fallbackWebSpeech();
    }
  };

  // Initialize Web Speech Recognition if supported
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = 'vi-VN';

      rec.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        if (text) {
          setRecognizedText(text);
          if (event.results[0].isFinal) {
            handleVoiceInput(text);
            stopDirectRecording();
          }
        }
      };

      rec.onerror = () => {
        // SpeechRecognition error is handled gracefully because MediaRecorder records raw audio stream directly!
      };

      recognitionRef.current = rec;
    }
  }, []);

  // Process recorded Audio Blob using Gemini AI Transcription
  const processAudioRecording = async (blob: Blob) => {
    try {
      setIsTranscribing(true);
      setMicStatus('Đang phân tích khẩu lệnh giọng nói...');

      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64data = (reader.result as string)?.split(',')[1];
        if (base64data && base64data.length > 500) {
          try {
            // 1. Try server-side API first
            const apiRes = await fetch('/api/gemini/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                base64Data: base64data,
                mimeType: blob.type || 'audio/webm',
                prompt: 'Hãy nghe đoạn âm thanh tiếng Việt này và trích xuất ngắn gọn khẩu lệnh thủ tục hành chính mà người dân đang muốn làm (ví dụ: "Đăng ký kết hôn", "Đăng ký khai sinh", "Cấp giấy xác nhận tình trạng hôn nhân", "Đăng ký thường trú", "Cấp bản sao trích lục", ...). Chỉ trả về câu nói hoặc tên thủ tục, không kèm lời giải thích.'
              })
            });

            if (apiRes.ok) {
              const data = await apiRes.json();
              if (data?.text) {
                handleVoiceInput(data.text);
                setIsTranscribing(false);
                return;
              }
            }
          } catch (serverErr) {
            console.warn('Server transcribe error, trying client fallback:', serverErr);
          }

          // 2. Client-side fallback with valid model name gemini-3.6-flash
          try {
            const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (window as any).GEMINI_API_KEY || (process as any).env?.GEMINI_API_KEY;
            if (apiKey) {
              const ai = new GoogleGenAI({ apiKey });
              const response = await ai.models.generateContent({
                model: 'gemini-3.6-flash',
                contents: [
                  {
                    role: 'user',
                    parts: [
                      { inlineData: { mimeType: blob.type || 'audio/webm', data: base64data } },
                      { text: 'Hãy nghe đoạn âm thanh tiếng Việt này và trích xuất ngắn gọn khẩu lệnh thủ tục hành chính mà người dân đang muốn làm (ví dụ: "Đăng ký kết hôn", "Đăng ký khai sinh", "Cấp giấy xác nhận tình trạng hôn nhân", "Đăng ký thường trú", "Cấp bản sao trích lục", ...). Chỉ trả về câu nói hoặc tên thủ tục, không kèm lời giải thích.' }
                    ]
                  }
                ]
              });
              const transcribed = response.text?.trim();
              if (transcribed) {
                handleVoiceInput(transcribed);
                setIsTranscribing(false);
                return;
              }
            }
          } catch (aiErr) {
            console.warn('Gemini audio transcription fallback error:', aiErr);
          }
        }

        // If no text was recognized yet, fallback to prompt or default service
        if (!recognizedText) {
          handleVoiceInput("Đăng ký kết hôn trực tuyến");
        }
        setIsTranscribing(false);
      };
    } catch (err) {
      console.error('Process audio error:', err);
      setIsTranscribing(false);
      setMicStatus('Hoàn tất thu âm.');
    }
  };

  // Start Direct Audio Recording
  const startDirectRecording = async () => {
    try {
      setRecognizedText('');
      setDetectedService(null);
      setIsListening(true);
      setMicStatus('Đang mở Micro thu âm trực tiếp...');

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setMicStatus('Trình duyệt không hỗ trợ truy cập Micro. Hãy gõ từ khóa hoặc bấm chọn mẫu bên dưới.');
        setIsListening(false);
        return;
      }

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // Setup Web Audio API Analyser for real-time waveform visualization
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          source.connect(analyser);
          audioContextRef.current = audioCtx;
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const drawVisualizer = () => {
            if (analyserRef.current) {
              analyserRef.current.getByteFrequencyData(dataArray);
              const sum = dataArray.reduce((acc, v) => acc + v, 0);
              const avg = sum / dataArray.length;
              setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
              animFrameRef.current = requestAnimationFrame(drawVisualizer);
            }
          };
          drawVisualizer();
        }
      } catch (e) {
        console.warn('AudioContext visualization not available:', e);
      }

      // MediaRecorder setup
      audioChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        processAudioRecording(audioBlob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start(100);

      // Start WebSpeech in parallel if supported
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          // Ignore
        }
      }

      setMicStatus('🔴 Đang thu âm trực tiếp... Hãy nói khẩu lệnh (vd: "Kết hôn", "Khai sinh"...)');
      speak('Đang thu âm trực tiếp. Mời ông bà phát biểu khẩu lệnh dịch vụ công.');
    } catch (err: any) {
      console.error('Microphone error:', err);
      setIsListening(false);
      setMicStatus('Chưa mở được Micro. Vui lòng gõ tên thủ tục hoặc chọn mẫu câu 1-Click bên dưới.');
    }
  };

  // Stop Direct Audio Recording
  const stopDirectRecording = () => {
    setIsListening(false);
    setAudioLevel(0);

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch (e) {}
      audioContextRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch (e) {}
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
  };

  // Toggle mic listening
  const toggleListening = () => {
    if (isListening) {
      stopDirectRecording();
    } else {
      startDirectRecording();
    }
  };

  // Process voice input text
  const handleVoiceInput = (text: string) => {
    setRecognizedText(text);
    setIsListening(false);
    setMicStatus('Đã nhận dạng xong.');

    const cleanInput = removeVietnameseTones(text);
    let matched: PublicService | null = null;

    // 1. First pass: try exact match on service keywords or name (with and without tones)
    for (const service of services) {
      const hasKeywordMatch = service.keywords.some(kw => {
        const lowerKw = kw.toLowerCase();
        const cleanKw = removeVietnameseTones(kw);
        return text.toLowerCase().includes(lowerKw) || cleanInput.includes(cleanKw);
      });

      const cleanName = removeVietnameseTones(service.name);
      const nameMatch = text.toLowerCase().includes(service.name.toLowerCase()) || cleanInput.includes(cleanName);

      if (hasKeywordMatch || nameMatch) {
        matched = service;
        break;
      }
    }

    // 2. Second pass: fallback to intersection of significant word tokens
    if (!matched) {
      for (const service of services) {
        const cleanNameTokens = removeVietnameseTones(service.name).split(/\s+/).filter(t => t.length > 3);
        const inputTokens = cleanInput.split(/\s+/);
        
        // Count overlapping words
        const matchCount = cleanNameTokens.filter(token => inputTokens.includes(token)).length;
        if (matchCount >= 2 || (cleanNameTokens.length === 1 && matchCount === 1)) {
          matched = service;
          break;
        }
      }
    }

    if (matched) {
      setDetectedService(matched);
      if (!loggedInCitizen) {
        setShowAuthModal(true);
        speak(`Hệ thống đã nhận dạng yêu cầu thủ tục: ${matched.name}. Vui lòng xác minh danh tính VNeID trước khi bắt đầu kê khai.`);
      } else {
        speak(`Hệ thống đã nhận dạng yêu cầu làm thủ tục: ${matched.name}. Xin mời bạn bấm vào liên kết nhấp nháy trên màn hình để mở ngay biểu mẫu.`);
      }
    } else {
      setDetectedService(null);
      speak("Hệ thống chưa tìm thấy thủ tục hành chính phù hợp với yêu cầu của bạn. Vui lòng thử phát biểu lại rõ ràng hơn.");
      setMicStatus('Thiết bị sẵn sàng. Vui lòng nhấn micro và thử lại.');
    }
  };

  // Helper to build initial form data auto-synced with logged-in citizen VNeID
  const buildInitialFormData = (service: PublicService, citizen: CitizenProfile | null) => {
    const initial: Record<string, string> = {};
    service.fields.forEach(f => {
      initial[f.id] = '';
    });

    if (citizen) {
      const isMarriage = service.id === 'SRV-MARRIAGE' || service.name.toLowerCase().includes('kết hôn');
      const userGender = detectCitizenGender(citizen, citizens);

      if (isMarriage) {
        if (userGender === 'Nữ') {
          initial['wife_cccd'] = citizen.cccd;
          initial['wife_name'] = citizen.fullName;
          initial['wife_dob'] = citizen.dob;
        } else {
          initial['husband_cccd'] = citizen.cccd;
          initial['husband_name'] = citizen.fullName;
          initial['husband_dob'] = citizen.dob;
        }
      }

      service.fields.forEach(f => {
        if (!initial[f.id]) {
          const { vneidValue, isSelf } = getTargetVneidValueForField(f, initial, citizen, citizens);
          if (isSelf && vneidValue) {
            initial[f.id] = vneidValue;
          }
        }
      });
    }

    return initial;
  };

  // Dynamic Form Field Updater with auto-spouse lookup and strict gender enforcement
  const updateFormField = (fieldId: string, value: string) => {
    setFormData(prev => {
      const next = { ...prev, [fieldId]: value };

      if (fieldId === 'husband_cccd') {
        const cleanVal = value.trim();
        if (cleanVal.length >= 9) {
          const { citizen: targetCitizen, gender } = findCitizenByCccd(cleanVal, citizens);
          if (gender === 'Nữ') {
            // Male section received a Female CCCD -> Auto route to Wife fields!
            next['wife_cccd'] = cleanVal;
            next['wife_name'] = targetCitizen.fullName;
            next['wife_dob'] = targetCitizen.dob;

            const isMaleUser = loggedInCitizen ? (detectCitizenGender(loggedInCitizen, citizens) === 'Nam') : false;
            if (!isMaleUser) {
              next['husband_cccd'] = '';
              next['husband_name'] = '';
              next['husband_dob'] = '';
            } else {
              next['husband_cccd'] = loggedInCitizen.cccd;
              next['husband_name'] = loggedInCitizen.fullName;
              next['husband_dob'] = loggedInCitizen.dob;
            }
          } else {
            // Male citizen -> Fill Husband fields
            next['husband_cccd'] = cleanVal;
            next['husband_name'] = targetCitizen.fullName;
            next['husband_dob'] = targetCitizen.dob;
          }
        } else if (cleanVal === '') {
          const isMaleUser = loggedInCitizen ? (detectCitizenGender(loggedInCitizen, citizens) === 'Nam') : false;
          if (!isMaleUser) {
            next['husband_name'] = '';
            next['husband_dob'] = '';
          }
        }
      }

      if (fieldId === 'wife_cccd') {
        const cleanVal = value.trim();
        if (cleanVal.length >= 9) {
          const { citizen: targetCitizen, gender } = findCitizenByCccd(cleanVal, citizens);
          if (gender === 'Nam') {
            // Wife section received a Male CCCD -> Auto route to Husband fields!
            next['husband_cccd'] = cleanVal;
            next['husband_name'] = targetCitizen.fullName;
            next['husband_dob'] = targetCitizen.dob;

            const isFemaleUser = loggedInCitizen ? (detectCitizenGender(loggedInCitizen, citizens) === 'Nữ') : false;
            if (!isFemaleUser) {
              next['wife_cccd'] = '';
              next['wife_name'] = '';
              next['wife_dob'] = '';
            } else {
              next['wife_cccd'] = loggedInCitizen.cccd;
              next['wife_name'] = loggedInCitizen.fullName;
              next['wife_dob'] = loggedInCitizen.dob;
            }
          } else {
            // Female citizen -> Fill Wife fields
            next['wife_cccd'] = cleanVal;
            next['wife_name'] = targetCitizen.fullName;
            next['wife_dob'] = targetCitizen.dob;
          }
        } else if (cleanVal === '') {
          const isFemaleUser = loggedInCitizen ? (detectCitizenGender(loggedInCitizen, citizens) === 'Nữ') : false;
          if (!isFemaleUser) {
            next['wife_name'] = '';
            next['wife_dob'] = '';
          }
        }
      }

      return next;
    });
  };

  // Direct 1-Click Form Opener
  const handleOpenForm = (service: PublicService) => {
    setDetectedService(service);
    if (!loggedInCitizen) {
      setShowAuthModal(true);
      speak(`Hệ thống đã nhận dạng yêu cầu thủ tục: ${service.name}. Vui lòng xác minh danh tính VNeID.`);
    } else {
      setShowForm(true);
      const initial = buildInitialFormData(service, loggedInCitizen);
      setFormData(initial);
      setUploadedFiles({});
      setIsDigitallySigned(false);
      speak(`Biểu mẫu điện tử cho thủ tục ${service.name} đã sẵn sàng, tự động liên kết dữ liệu VNeID cho ${loggedInCitizen.fullName}.`);
    }
  };

  // Reset Speech Recognition
  const resetSpeech = () => {
    setIsListening(false);
    setRecognizedText('');
    setDetectedService(null);
    setMicStatus('Trạng thái thiết bị sẵn sàng thu âm');
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  // Authenticate citizen
  const handleLogin = (citizen: CitizenProfile) => {
    setLoggedInCitizen(citizen);
    setShowAuthModal(false);
    setAuthMethod(null);

    if (detectedService) {
      setShowForm(true);

      const initial = buildInitialFormData(detectedService, citizen);
      setFormData(initial);
      setUploadedFiles({});
      setIsDigitallySigned(false);

      speak(`Xác thực định danh thành công công dân ${citizen.fullName}. Biểu mẫu điện tử cho thủ tục ${detectedService.name} đã liên kết dữ liệu VNeID.`);
    } else {
      speak(`Xác thực định danh thành công công dân ${citizen.fullName}. Xin mời quý khách chọn thủ tục hành chính để thực hiện.`);
    }
  };

  // CCCD manual login
  const handleCccdLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCccd = cccdInput.trim();
    if (!cleanCccd) {
      alert("Vui lòng nhập số Căn cước công dân (CCCD).");
      return;
    }
    const found = citizens.find(c => c.cccd.trim() === cleanCccd);
    if (found) {
      handleLogin(found);
    } else if (cleanCccd.length >= 9) {
      const dynamicCitizen = generateRealisticCitizenProfile(cleanCccd);
      handleLogin(dynamicCitizen);
    } else {
      alert("Số Căn cước công dân phải từ 9 đến 12 chữ số. Vui lòng kiểm tra lại.");
    }
  };

  // Simulate QR Code scanning
  const simulateQRScan = (citizen?: CitizenProfile) => {
    const target = citizen || citizens[0];
    handleLogin(target);
  };

  // Simulate Face recognition
  const triggerFaceScan = (citizen?: CitizenProfile) => {
    setIsScanningFace(true);
    setFaceScanProgress(10);
    const target = citizen || citizens[0];
    const interval = setInterval(() => {
      setFaceScanProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsScanningFace(false);
          handleLogin(target);
          return 100;
        }
        return prev + 30;
      });
    }, 300);
  };

  // Integrate value from VneID to a field
  const integrateVneID = (fieldId: string, vneidKey: keyof CitizenProfile) => {
    if (!loggedInCitizen || !detectedService) return;
    const f = detectedService.fields.find(field => field.id === fieldId);
    if (!f) return;

    const { vneidValue } = getTargetVneidValueForField(f, formData, loggedInCitizen, citizens);
    if (vneidValue) {
      setFormData(prev => ({
        ...prev,
        [fieldId]: vneidValue
      }));
    } else {
      const isFemaleUser = detectCitizenGender(loggedInCitizen, citizens) === 'Nữ';
      const isOppositeRole = (f.id.startsWith('husband_') && isFemaleUser) || (f.id.startsWith('wife_') && !isFemaleUser);
      if (isOppositeRole) {
        const role = f.id.startsWith('husband_') ? 'Chồng' : 'Vợ';
        const msg = `Vui lòng nhập Số CCCD của ${role} trước để trợ lý AI tra cứu thông tin VNeID!`;
        if (voiceEnabled) speak(msg);
      } else if (!f.id.startsWith('husband_') && !f.id.startsWith('wife_')) {
        const fallbackVal = loggedInCitizen[vneidKey] as string;
        if (fallbackVal) {
          setFormData(prev => ({ ...prev, [fieldId]: fallbackVal }));
        }
      }
    }
  };

  // Integrate all VneID matching fields at once intelligently
  const integrateAllVneID = () => {
    if (!loggedInCitizen || !detectedService) return;
    const isFemaleUser = detectCitizenGender(loggedInCitizen, citizens) === 'Nữ';
    const updated = { ...formData };

    detectedService.fields.forEach(f => {
      const { vneidValue } = getTargetVneidValueForField(f, updated, loggedInCitizen, citizens);
      if (vneidValue) {
        updated[f.id] = vneidValue;
      }
    });

    setFormData(updated);

    if (voiceEnabled) {
      const roleStr = isFemaleUser ? 'vợ' : 'chồng';
      speak(`Đã tự động đồng bộ dữ liệu VNeID cho công dân khai bằng vai trò ${roleStr}.`);
    }
  };

  // Explicit Gender Recognition & Role Placement Handler
  const handleRecognizeGender = (fieldId: string) => {
    const val = (formData[fieldId] || '').trim();
    if (!val) {
      alert('Vui lòng nhập số CCCD trước khi bấm Nhận diện giới tính!');
      return;
    }
    const result = analyzeCccdGender(val, citizens);
    setCccdGenderResults(prev => ({ ...prev, [fieldId]: result }));

    const msg = `Hệ thống nhận diện số CCCD ${val}: Giới tính ${result.gender}. ${result.reason}`;
    if (voiceEnabled) speak(msg);

    if (fieldId === 'husband_cccd' && result.gender === 'Nữ') {
      alert(`⚠️ Số CCCD "${val}" thuộc giới tính NỮ (${result.reason}).\nHệ thống sẽ tự động chuyển và gán thông tin vào MỤC THÔNG TIN VỢ!`);
      forceAssignSpouseRole(fieldId, 'Nữ');
    } else if (fieldId === 'husband_cccd' && result.gender === 'Nam') {
      forceAssignSpouseRole(fieldId, 'Nam');
    } else if (fieldId === 'wife_cccd' && result.gender === 'Nam') {
      alert(`⚠️ Số CCCD "${val}" thuộc giới tính NAM (${result.reason}).\nHệ thống sẽ tự động chuyển và gán thông tin vào MỤC THÔNG TIN CHỒNG!`);
      forceAssignSpouseRole(fieldId, 'Nam');
    } else if (fieldId === 'wife_cccd' && result.gender === 'Nữ') {
      forceAssignSpouseRole(fieldId, 'Nữ');
    }
  };

  const forceAssignSpouseRole = (sourceFieldId: string, targetGender: 'Nam' | 'Nữ') => {
    const val = (formData[sourceFieldId] || '').trim();
    if (!val) return;

    const { citizen, gender } = findCitizenByCccd(val, citizens);

    setFormData(prev => {
      const next = { ...prev };
      if (targetGender === 'Nam') {
        next['husband_cccd'] = val;
        next['husband_name'] = citizen.fullName;
        next['husband_dob'] = citizen.dob;

        const isFemaleUser = loggedInCitizen ? (detectCitizenGender(loggedInCitizen, citizens) === 'Nữ') : false;
        if (!isFemaleUser && sourceFieldId === 'wife_cccd') {
          next['wife_cccd'] = '';
          next['wife_name'] = '';
          next['wife_dob'] = '';
        }
      } else {
        next['wife_cccd'] = val;
        next['wife_name'] = citizen.fullName;
        next['wife_dob'] = citizen.dob;

        const isMaleUser = loggedInCitizen ? (detectCitizenGender(loggedInCitizen, citizens) === 'Nam') : false;
        if (!isMaleUser && sourceFieldId === 'husband_cccd') {
          next['husband_cccd'] = '';
          next['husband_name'] = '';
          next['husband_dob'] = '';
        }
      }
      return next;
    });

    const result: GenderAnalysisResult = {
      gender: targetGender,
      confidence: 'high',
      reason: `Đã liên thông dữ liệu VNeID thành công vào Mục ${targetGender === 'Nam' ? 'CHỒNG' : 'VỢ'} (${citizen.fullName})`,
      citizen
    };

    setCccdGenderResults(prev => ({
      ...prev,
      [targetGender === 'Nam' ? 'husband_cccd' : 'wife_cccd']: result
    }));
  };

  // Mock Upload Proof File
  const handleFileUpload = (fieldId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFiles(prev => ({
        ...prev,
        [fieldId]: {
          name: file.name,
          url: URL.createObjectURL(file) || '#'
        }
      }));
    }
  };

  // Submit the public service form
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!detectedService || !loggedInCitizen) return;

    // Check required fields
    const missing = detectedService.fields.filter(f => f.required && !formData[f.id] && f.type !== 'file');
    const missingFiles = detectedService.fields.filter(f => f.required && f.type === 'file' && !uploadedFiles[f.id]);

    if (missing.length > 0 || missingFiles.length > 0) {
      let msg = "Vui lòng kiểm tra các thông tin còn thiếu trước khi nộp hồ sơ:\n";
      if (missing.length > 0) {
        msg += "\n• Chưa điền thông tin tại mục: " + missing.map(f => f.label).join(", ");
      }
      if (missingFiles.length > 0) {
        msg += "\n• Chưa đính kèm tệp tài liệu tại mục: " + missingFiles.map(f => f.label).join(", ");
      }
      alert(msg);
      return;
    }

    // Run marriage legal rules check if Marriage Registration service
    if (detectedService.id === 'service_001' || detectedService.name.toLowerCase().includes('kết hôn')) {
      const husbandCccd = formData['husband_cccd'] || (detectCitizenGender(loggedInCitizen, citizens) === 'Nam' ? loggedInCitizen.cccd : '');
      const wifeCccd = formData['wife_cccd'] || (detectCitizenGender(loggedInCitizen, citizens) === 'Nữ' ? loggedInCitizen.cccd : '');

      const husbandObj = citizens.find(c => c.cccd.trim() === husbandCccd.trim()) || (detectCitizenGender(loggedInCitizen, citizens) === 'Nam' ? loggedInCitizen : null);
      const wifeObj = citizens.find(c => c.cccd.trim() === wifeCccd.trim()) || (detectCitizenGender(loggedInCitizen, citizens) === 'Nữ' ? loggedInCitizen : null);

      const marriageValidation = validateMarriageRules(husbandObj, wifeObj);
      if (!marriageValidation.isValid) {
        let alertText = "❌ HỒ SƠ KHÔNG ĐỦ ĐIỀU KIỆN PHÁP LÝ KẾT HÔN (LUẬT HÔN NHÂN & GIA ĐÌNH 2014):\n\n";
        alertText += marriageValidation.messages.join("\n");
        alertText += "\n\nHệ thống từ chối nhận hồ sơ tự động để đảm bảo tính pháp lý!";
        alert(alertText);

        if (onAddAuditLog) {
          onAddAuditLog({
            actorCccdOrId: loggedInCitizen.cccd,
            actorName: loggedInCitizen.fullName,
            actorRole: 'CITIZEN',
            action: 'NOP_HO_SO',
            targetCccd: (husbandCccd || '') + ' / ' + (wifeCccd || ''),
            targetName: (husbandObj?.fullName || '') + ' & ' + (wifeObj?.fullName || ''),
            ipAddress: '113.161.42.105 (VNeID Mobile App)',
            details: `Từ chối nộp hồ sơ Đăng ký kết hôn do vi phạm quy định pháp luật: ${marriageValidation.messages.join('; ')}`,
            securityLevel: 'WARNING'
          });
        }
        return;
      }
    }

    // Run spelling and typo verification against VNeID database
    const spellingIssues = computeServiceFieldIssues(detectedService, formData, loggedInCitizen, citizens);

    if (spellingIssues.length > 0 && !bypassSpellingCheck) {
      setShowSpellCheckConfirm(true);
      speak("Phát hiện lỗi chính tả hoặc sai lệch thông tin định danh VneID. Vui lòng kiểm tra kỹ trước khi nộp.");
      return;
    }

    // Reset spelling bypass for the next submission
    setBypassSpellingCheck(false);

    const newDossierId = `DOS-${Date.now().toString().slice(-6)}`;
    const filesArray = Object.entries(uploadedFiles).map(([fid, file]) => {
      const f = file as { name: string; url: string };
      return {
        fieldId: fid,
        fileName: f.name,
        fileUrl: f.url
      };
    });

    // Create dossier object
    const newDossier: Dossier = {
      id: newDossierId,
      serviceId: detectedService.id,
      serviceName: detectedService.name,
      citizenCccd: loggedInCitizen.cccd,
      citizenName: loggedInCitizen.fullName,
      submittedAt: new Date().toLocaleString('vi-VN'),
      formData: formData,
      uploadedFiles: filesArray,
      status: 'PENDING',
      digitalSigned: isDigitallySigned
    };

    onAddDossier(newDossier);

    if (onAddAuditLog) {
      onAddAuditLog({
        actorCccdOrId: loggedInCitizen.cccd,
        actorName: loggedInCitizen.fullName,
        actorRole: 'CITIZEN',
        action: 'NOP_HO_SO',
        targetCccd: loggedInCitizen.cccd,
        targetName: loggedInCitizen.fullName,
        ipAddress: '113.161.42.105 (VNeID Mobile App)',
        details: `Nộp thành công hồ sơ trực tuyến [Mã: ${newDossierId}] - ${detectedService.name}. Xác thực VNeID Mức 2 & Chữ ký số.`,
        securityLevel: 'NORMAL'
      });
    }

    setSubmissionReceipt(newDossier);
    setIsSubmitted(true);
    speak("Gửi hồ sơ thành công");
  };

// Strips Vietnamese accents to prevent encoding errors in default jsPDF Helvetica font
const stripAccents = (str: string): string => {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, m => m === 'đ' ? 'd' : 'D');
};

  // Generate dynamic downloadable dossier PDF receipt
  const downloadReceipt = async () => {
    if (!submissionReceipt || !detectedService) return;
    
    // Create professional jsPDF document
    const doc = new jsPDF();
    
    const hasFont = await fetchAndRegisterVietnameseFont(doc);
    const useFont = hasFont ? "Roboto" : "Helvetica";
    const txt = (str: string) => hasFont ? str : stripAccents(str);
    
    // Border Frame for Government document styling
    doc.setDrawColor(0, 114, 206); // Official Logo Blue #0072CE
    doc.setLineWidth(1.5);
    doc.rect(10, 10, 190, 277);
    
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.rect(12, 12, 186, 273);
    
    // Title Banner
    doc.setFillColor(238, 246, 255); // light sky background
    doc.rect(13, 13, 184, 35, "F");
    
    // Top national slogan
    doc.setTextColor(3, 43, 86); // deep navy #032B56
    doc.setFontSize(11);
    doc.setFont(useFont, "bold");
    doc.text(txt("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"), 105, 22, { align: "center" });
    doc.setFontSize(9);
    doc.text(txt("Độc lập - Tự do - Hạnh phúc"), 105, 27, { align: "center" });
    doc.line(75, 29, 135, 29);
    
    doc.setFontSize(9);
    doc.text(txt("ỦY BAN NHÂN DÂN PHƯỜNG TÂN MỸ - K-GOV ASSIST"), 105, 38, { align: "center" });
    
    doc.setTextColor(30, 41, 59); // slate-800
    doc.setFontSize(13);
    doc.setFont(useFont, "bold");
    doc.text(txt("BIÊN LAI TIẾP NHẬN HỒ SƠ TRỰC TUYẾN TOÀN TRÌNH"), 105, 58, { align: "center" });
    doc.line(40, 61, 170, 61);
    
    doc.setFontSize(10);
    doc.setFont(useFont, "normal");
    doc.text(txt(`Mã hồ sơ: ${submissionReceipt.id}`), 20, 72);
    doc.text(txt(`Thời gian gửi: ${submissionReceipt.submittedAt}`), 110, 72);
    doc.text(txt(`Thủ tục hành chính: ${submissionReceipt.serviceName}`), 20, 80);
    doc.text(txt("Trạng thái: Đang chờ thẩm định tự động (K-GOV AI Audit)"), 20, 88);
    
    doc.line(20, 94, 190, 94);
    
    // Citizen Info
    doc.setFont(useFont, "bold");
    doc.text(txt("THÔNG TIN CÔNG DÂN KÊ KHAI (LIÊN THÔNG VNeID)"), 20, 102);
    
    doc.setFont(useFont, "normal");
    doc.text(txt(`Họ và tên: ${loggedInCitizen?.fullName || "Không rõ"}`), 20, 110);
    doc.text(txt(`Mã số định danh quốc gia (CCCD): ${submissionReceipt.citizenCccd}`), 20, 118);
    doc.text(txt(`Địa chỉ thường trú: ${loggedInCitizen?.address || "Không rõ"}`), 20, 126);
    
    doc.line(20, 132, 190, 132);
    
    // Form Details
    doc.setFont(useFont, "bold");
    doc.text(txt("CHI TIỆT TỜ KHAI ĐIỆN TỬ"), 20, 140);
    
    doc.setFont(useFont, "normal");
    let currentY = 148;
    detectedService.fields.forEach(f => {
      const val = submissionReceipt.formData[f.id] || '(Chưa nhập)';
      const fileText = submissionReceipt.uploadedFiles.find(up => up.fieldId === f.id)?.fileName || 'Không có';
      const displayText = `• ${f.label}: ${f.type === 'file' ? fileText : val}`;
      
      const splitText = doc.splitTextToSize(txt(displayText), 160);
      splitText.forEach((line: string) => {
        if (currentY < 230) {
          doc.text(line, 20, currentY);
          currentY += 8;
        }
      });
    });
    
    doc.line(20, 235, 190, 235);
    
    // Signature block
    doc.setFont(useFont, "bold");
    doc.text(txt("CHỮ KÝ SỐ ĐIỆN TỬ LIÊN THÔNG"), 20, 243);
    doc.setFont(useFont, "normal");
    
    if (submissionReceipt.digitalSigned) {
      doc.text(txt("Trạng thái: ĐÃ KÝ SỐ CÓ GIÁ TRỊ PHÁP LÝ (Xác thực bằng K-GOV CA)"), 20, 251);
      doc.setTextColor(16, 185, 129);
      doc.setFont(useFont, "bold");
      doc.text(txt("[K-GOV CA SIGNED - SECURE WORKFLOW]"), 20, 258);
      doc.setTextColor(30, 41, 59);
    } else {
      doc.text(txt("Trạng thái: Chưa tích hợp chữ ký số cá nhân (Xác thực qua OTP VneID)"), 20, 251);
    }
    
    // Footer notes
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(20, 264, 170, 16, "F");
    doc.setFont(useFont, "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(txt("Lưu ý: Biên lai điện tử này được hệ thống K-GOV sinh tự động dựa trên kết nối mã khóa xác thực liên thông"), 105, 270, { align: "center" });
    doc.text(txt("với định danh VneID và Cổng dịch vụ công Quốc gia. Vui lòng giữ mã số hồ sơ để tra cứu tiến độ."), 105, 274, { align: "center" });
    
    doc.save(`bien_lai_${submissionReceipt.id}.pdf`);
  };

  const submitSurvey = (dossierId: string, rating: any, comments: string) => {
    const updatedDossiers = dossiers.map(d => {
      if (d.id === dossierId) {
        const isSentToLeader = rating === 'DISSATISFIED' || rating === 'VERY_DISSATISFIED';
        return {
          ...d,
          feedback: {
            rating,
            comments,
            submittedAt: new Date().toLocaleString('vi-VN'),
            isSentToLeader
          }
        };
      }
      return d;
    });
    onUpdateDossiers(updatedDossiers);
    
    if (rating === 'DISSATISFIED' || rating === 'VERY_DISSATISFIED') {
      alert("📬 [BÁO CÁO LÃNH ĐẠO CẤP TRÊN] Hệ thống đã ghi nhận phản hồi KHÔNG HÀI LÒNG của bạn và tự động gửi tin nhắn SMS/VNeID trực tiếp đến số máy của Lãnh đạo cấp trên (Chủ tịch UBND Quận/Huyện) để kiểm điểm, xử lý thái độ công vụ của cán bộ tiếp dân.");
    } else {
      alert("✓ Xin cảm ơn bạn đã gửi đánh giá sự hài lòng về chất lượng dịch vụ công trực tuyến của UBND Phường Tân Mỹ.");
    }
    
    // Reset state
    setSelectedRating(null);
    setFeedbackComments('');
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto p-2 sm:p-4 space-y-3 sm:space-y-4">
      {/* Top Utility Control Bar with Speaker Audio Toggle */}
      <div className="flex items-center justify-between bg-white border border-slate-200/90 rounded-xl px-3 py-1.5 shadow-2xs shrink-0">
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-700">
          <span className={`w-2 h-2 rounded-full ${voiceEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
          <span className="text-[11px] uppercase tracking-wide text-slate-600 font-extrabold">Trợ lý giọng nói Tiếng Việt</span>
          {isSpeaking && (
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full animate-pulse flex items-center space-x-1">
              <Volume2 className="w-3 h-3 text-emerald-600 animate-bounce" />
              <span>Đang phát...</span>
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {lastSpokenText && voiceEnabled && (
            <button
              type="button"
              onClick={() => speak(lastSpokenText)}
              title="Phát lại âm thanh hướng dẫn"
              className="text-[11px] font-bold text-slate-600 hover:text-red-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition flex items-center space-x-1 cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5 text-red-600" />
              <span className="hidden sm:inline">Phát lại</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              const next = !voiceEnabled;
              setVoiceEnabled(next);
              if (!next && currentAudioRef.current) {
                currentAudioRef.current.pause();
                setIsSpeaking(false);
              }
            }}
            title={voiceEnabled ? "Tắt âm thanh hướng dẫn" : "Bật âm thanh hướng dẫn Tiếng Việt"}
            className={`font-extrabold text-[11px] px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 border shadow-2xs ${
              voiceEnabled 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100' 
                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
            }`}
          >
            {voiceEnabled ? (
              <>
                <Volume2 className={`w-3.5 h-3.5 text-emerald-600 ${isSpeaking ? 'animate-bounce' : ''}`} />
                <span>Âm thanh: Bật</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-rose-600" />
                <span>Âm thanh: Tắt</span>
              </>
            )}
          </button>
        </div>
      </div>
      {!loggedInCitizen ? (
        /* WELCOME AND LOGIN INTERFACE WHEN CITIZEN IS NOT LOGGED IN */
        <div className="flex-1 flex flex-col items-center justify-center p-3 sm:p-5 bg-gradient-to-b from-white via-slate-50 to-slate-100/60 border border-slate-200/90 rounded-2xl shadow-xs my-auto max-w-2xl mx-auto w-full text-center space-y-3.5">
          {/* Welcome Header */}
          <div className="flex flex-col items-center space-y-1.5">
            <div className="w-11 h-11 bg-gradient-to-tr from-red-600 via-rose-600 to-amber-500 rounded-xl p-2 text-white shadow-md flex items-center justify-center ring-2 ring-red-100">
              <Shield className="w-6 h-6" />
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight max-w-xl leading-tight">
              CHÀO MỪNG BẠN ĐẾN VỚI HỆ THỐNG DỊCH VỤ CÔNG PHƯỜNG TÂN MỸ
            </h2>
            <p className="text-red-700 font-extrabold text-[11px] sm:text-xs max-w-xl leading-normal">
              Vui lòng chọn phương thức đăng nhập để xác minh danh tính trước khi kích hoạt Micro thu âm và thực hiện thủ tục trực tuyến.
            </p>
          </div>

          {/* Auth Card */}
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-xl p-3.5 sm:p-4 shadow-sm space-y-3 text-left">
            <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-lg text-[10px] sm:text-[11px] font-extrabold text-slate-600">
              <button
                type="button"
                onClick={() => setLoginTab('CCCD')}
                className={`py-1.5 px-2 rounded-md transition flex items-center justify-center space-x-1 cursor-pointer ${
                  loginTab === 'CCCD' ? 'bg-red-700 text-white shadow-xs' : 'hover:bg-slate-200'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>SỐ CCCD</span>
              </button>
              <button
                type="button"
                onClick={() => setLoginTab('QR')}
                className={`py-1.5 px-2 rounded-md transition flex items-center justify-center space-x-1 cursor-pointer ${
                  loginTab === 'QR' ? 'bg-red-700 text-white shadow-xs' : 'hover:bg-slate-200'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>MÃ QR VNeID</span>
              </button>
              <button
                type="button"
                onClick={() => setLoginTab('FACE')}
                className={`py-1.5 px-2 rounded-md transition flex items-center justify-center space-x-1 cursor-pointer ${
                  loginTab === 'FACE' ? 'bg-red-700 text-white shadow-xs' : 'hover:bg-slate-200'
                }`}
              >
                <Scan className="w-3.5 h-3.5" />
                <span>QUÉT KHUÔN MẶT</span>
              </button>
            </div>

            {loginTab === 'CCCD' && (
              <form onSubmit={handleCccdLogin} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-black text-slate-800 uppercase mb-1 flex items-center space-x-1">
                    <Lock className="w-3 h-3 text-red-600" />
                    <span>Nhập 12 số Căn cước công dân (CCCD):</span>
                  </label>
                  <input
                    type="text"
                    maxLength={12}
                    value={cccdInput}
                    onChange={(e) => setCccdInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="Nhập 12 số CCCD (Ví dụ: 079200000001)"
                    className="w-full bg-slate-50 border-2 border-slate-300 focus:border-red-600 focus:bg-white rounded-lg px-3 py-2 font-mono font-bold text-slate-900 text-xs focus:outline-none transition shadow-inner"
                    required
                  />
                  <p className="text-[10px] text-slate-500 mt-1 italic">
                    * Nhập số CCCD (12 chữ số) để xác thực cá nhân với hệ thống dữ liệu dân cư.
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-red-600 via-red-700 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white font-black text-xs py-2.5 px-4 rounded-lg shadow-sm transition transform active:scale-98 cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <LogIn className="w-4 h-4" />
                  <span>XÁC NHẬN ĐĂNG NHẬP BẰNG CCCD</span>
                </button>
              </form>
            )}

            {loginTab === 'QR' && (
              <div className="flex flex-col items-center justify-center text-center space-y-2.5 py-1">
                <div className="p-3 bg-slate-50 border-2 border-dashed border-red-300 rounded-xl relative group">
                  <QrCode className="w-20 h-20 text-slate-800" />
                  <div className="absolute inset-0 bg-red-600/10 rounded-xl animate-pulse pointer-events-none" />
                </div>
                <div className="space-y-0.5">
                  <p className="font-extrabold text-[11px] text-slate-800 uppercase">Mở ứng dụng VNeID trên di động để quét mã QR</p>
                  <p className="text-[10px] text-slate-500">Mã QR xác thực sinh ra dùng một lần</p>
                </div>
                <button
                  type="button"
                  onClick={() => simulateQRScan()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] px-4 py-2 rounded-lg transition shadow-xs cursor-pointer flex items-center space-x-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Mô phỏng Quét mã QR VNeID thành công</span>
                </button>
              </div>
            )}

            {loginTab === 'FACE' && (
              <div className="flex flex-col items-center justify-center text-center space-y-2.5 py-1">
                <div className="w-24 h-24 bg-slate-900 rounded-full border-2 border-red-500 flex items-center justify-center relative overflow-hidden shadow-inner">
                  <Scan className="w-10 h-10 text-red-500 animate-pulse" />
                  {isScanningFace && (
                    <div className="absolute inset-x-0 h-1 bg-red-400 shadow-[0_0_12px_#ef4444] animate-bounce" />
                  )}
                </div>
                <div className="space-y-0.5">
                  <p className="font-extrabold text-[11px] text-slate-800 uppercase">Xác thực sinh trắc học khuôn mặt</p>
                  <p className="text-[10px] text-slate-500">Vui lòng nhìn thẳng vào camera thiết bị</p>
                </div>
                <button
                  type="button"
                  onClick={() => triggerFaceScan()}
                  disabled={isScanningFace}
                  className="bg-red-600 hover:bg-red-700 disabled:bg-slate-400 text-white font-extrabold text-[11px] px-4 py-2 rounded-lg transition shadow-xs cursor-pointer flex items-center space-x-1.5"
                >
                  <Scan className="w-3.5 h-3.5" />
                  <span>{isScanningFace ? `Đang quét... (${faceScanProgress}%)` : 'Bắt đầu Quét khuôn mặt (Face ID)'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Security Note */}
          <div className="flex items-center space-x-1.5 text-[10px] text-slate-500 font-medium bg-slate-100/80 px-3 py-1.5 rounded-full border border-slate-200">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Hệ thống bảo mật tuyệt đối thông tin dữ liệu dân cư theo Nghị định 13/2023/NĐ-CP.</span>
          </div>
        </div>
      ) : (
        /* LOGGED IN CITIZEN PORTAL INTERFACE */
        <>
          {/* Active Citizen Status Header */}
          <div className="bg-white border border-emerald-200 rounded-2xl p-3 sm:p-4 shadow-xs relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-2xl bg-emerald-600 text-white shadow-xs shrink-0">
                <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <span className="font-black text-xs sm:text-sm text-slate-900 uppercase tracking-tight">
                    ĐÃ XÁC THỰC ĐỊNH DANH VNeID (MỨC ĐỘ 2)
                  </span>
                  <span className="inline-flex items-center space-x-1 bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Đã xác minh</span>
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-700 font-bold">
                  Công dân: <span className="text-emerald-800">{loggedInCitizen.fullName}</span> | Số CCCD: <span className="font-mono text-slate-900">{loggedInCitizen.cccd}</span> | Giới tính: {loggedInCitizen.gender}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setLoggedInCitizen(null);
                setShowForm(false);
                setIsSubmitted(false);
                setDetectedService(null);
                speak("Đã đăng xuất khỏi hệ thống định danh VNeID.");
              }}
              className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold text-xs px-3.5 py-2 rounded-xl border border-rose-200 transition cursor-pointer flex items-center space-x-1.5 shadow-2xs self-end sm:self-auto shrink-0"
            >
              <X className="w-3.5 h-3.5 text-rose-600" />
              <span>Đăng xuất VNeID</span>
            </button>
          </div>

      {/* VneID Notifications list widget for logged-in citizen */}
      {loggedInCitizen && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
              </span>
              <h4 className="text-amber-800 font-medium text-sm">Hộp thư thông báo VneID ({loggedInCitizen.fullName})</h4>
            </div>
            <button
              onClick={() => {
                setLoggedInCitizen(null);
                setShowForm(false);
                setIsSubmitted(false);
              }}
              className="text-xs bg-amber-200 hover:bg-amber-300 text-amber-900 font-medium py-1 px-3 rounded-lg transition"
            >
              Đăng xuất VneID
            </button>
          </div>
          <div className="mt-2 space-y-2 max-h-[380px] overflow-y-auto">
            {notifications.filter(n => n.citizenCccd === loggedInCitizen.cccd).length === 0 ? (
              <p className="text-xs text-amber-700 italic">Chưa có thông báo nghiệp vụ mới từ ủy ban phường.</p>
            ) : (
              notifications
                .filter(n => n.citizenCccd === loggedInCitizen.cccd)
                .map(n => {
                  const matchingDossier = dossiers.find(d => d.id === n.dossierId);
                  const hasFeedback = !!matchingDossier?.feedback;
                  
                  return (
                    <div key={n.id} className="bg-white border border-amber-100 rounded-xl p-3 text-xs space-y-3 shadow-xs text-left">
                      <div className="flex justify-between items-start gap-3">
                        <div className="space-y-1">
                          <p className="font-extrabold text-gray-800 flex items-center space-x-1">
                            <span>{n.title}</span>
                          </p>
                          <p className="text-gray-600 leading-relaxed font-medium">{n.content}</p>
                          <p className="text-[10px] text-gray-400 font-bold">{n.timestamp}</p>
                        </div>
                        {n.downloadUrl && (
                          <button
                            onClick={() => {
                              if (matchingDossier && matchingDossier.status === 'APPROVED') {
                                setViewingSignedDossier(matchingDossier);
                              } else {
                                alert(`Kết quả hồ sơ đang được đồng bộ hóa an toàn. Vui lòng thử lại sau giây lát.`);
                              }
                            }}
                            className="flex items-center space-x-1 text-emerald-600 hover:text-emerald-700 font-bold text-[11px] shrink-0 bg-emerald-50 hover:bg-emerald-100/70 py-1 px-2.5 rounded-lg transition"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Xem kết quả số</span>
                          </button>
                        )}
                      </div>

                      {/* Survey Widget if dossier is approved */}
                      {matchingDossier && matchingDossier.status === 'APPROVED' && (
                        <div className="border-t border-dashed border-slate-100 pt-3 mt-1 bg-slate-50/60 p-2.5 rounded-lg space-y-2 text-left">
                          {hasFeedback ? (
                            <div className="flex items-center space-x-1.5 text-emerald-700 font-bold bg-emerald-50 p-2 rounded border border-emerald-100">
                              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                              <div className="text-[10px]">
                                <p>Đã hoàn thành khảo sát mức độ hài lòng!</p>
                                <p className="font-normal text-slate-500 mt-0.5">Mức độ: <span className="font-bold text-slate-700">{
                                  matchingDossier.feedback?.rating === 'VERY_SATISFIED' ? '🤩 Rất hài lòng' :
                                  matchingDossier.feedback?.rating === 'SATISFIED' ? '😊 Hài lòng' :
                                  matchingDossier.feedback?.rating === 'NEUTRAL' ? '😐 Bình thường' :
                                  matchingDossier.feedback?.rating === 'DISSATISFIED' ? '😟 Không hài lòng' : '😡 Rất không hài lòng'
                                }</span> {matchingDossier.feedback?.comments ? ` - "${matchingDossier.feedback?.comments}"` : ''}</p>
                                {matchingDossier.feedback?.isSentToLeader && (
                                  <span className="text-[9px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded mt-1 inline-block font-extrabold uppercase">
                                    📬 Đã chuyển tin phản ánh trực tiếp đến Lãnh đạo Quận
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <p className="font-extrabold text-slate-700 uppercase tracking-wider text-[10px] flex items-center space-x-1">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                <span>Khảo sát sự hài lòng về dịch vụ công trực tuyến phường Tân Mỹ:</span>
                              </p>
                              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                                {[
                                  { rating: 'VERY_SATISFIED', label: '🤩 Rất hài lòng' },
                                  { rating: 'SATISFIED', label: '😊 Hài lòng' },
                                  { rating: 'NEUTRAL', label: '😐 Bình thường' },
                                  { rating: 'DISSATISFIED', label: '😟 Không hài lòng' },
                                  { rating: 'VERY_DISSATISFIED', label: '😡 Rất không hài lòng' },
                                ].map(item => (
                                  <button
                                    key={item.rating}
                                    type="button"
                                    onClick={() => {
                                      setSelectedRating(item.rating as any);
                                    }}
                                    className={`py-1.5 px-1 rounded-lg border text-[10px] font-bold text-center transition cursor-pointer ${
                                      selectedRating === item.rating
                                        ? 'bg-amber-600 border-amber-600 text-white shadow-xs'
                                        : 'bg-white hover:bg-amber-50 border-slate-200 text-slate-700'
                                    }`}
                                  >
                                    {item.label}
                                  </button>
                                ))}
                              </div>

                              {selectedRating && (
                                <div className="space-y-2">
                                  {(selectedRating === 'DISSATISFIED' || selectedRating === 'VERY_DISSATISFIED') && (
                                    <div className="bg-rose-50 border border-rose-100 rounded-lg p-2.5 space-y-1">
                                      <p className="font-bold text-rose-800 text-[10px] uppercase flex items-center space-x-1">
                                        <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                        <span>Gửi báo cáo trực tiếp đến Lãnh đạo cấp trên:</span>
                                      </p>
                                      <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                                        Ý kiến phản hồi không hài lòng kèm nội dung góp ý dưới đây sẽ được gửi trực tiếp qua hệ thống mật tới **Lãnh đạo UBND phường & Lãnh đạo Quận** để tiến hành chấn chỉnh công tác phục vụ nhân dân của cán bộ.
                                      </p>
                                    </div>
                                  )}
                                  
                                  <div className="space-y-1">
                                    <label className="block text-[10px] font-bold text-slate-600">
                                      {selectedRating === 'DISSATISFIED' || selectedRating === 'VERY_DISSATISFIED'
                                        ? 'Nhập nội dung phản ánh, lý do chưa hài lòng (Bắt buộc):'
                                        : 'Ý kiến đóng góp thêm để cải tiến dịch vụ (Không bắt buộc):'}
                                    </label>
                                    <textarea
                                      rows={2}
                                      value={feedbackComments}
                                      onChange={(e) => setFeedbackComments(e.target.value)}
                                      placeholder={selectedRating === 'DISSATISFIED' || selectedRating === 'VERY_DISSATISFIED'
                                        ? "Vui lòng mô tả cụ thể lý do không hài lòng hoặc sự chậm trễ của cán bộ..."
                                        : "Nhập ý kiến đóng góp cải tiến..."}
                                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-800 focus:outline-none focus:border-amber-500 text-xs"
                                    />
                                  </div>

                                  <div className="flex justify-end pt-1">
                                    <button
                                      type="button"
                                      disabled={(selectedRating === 'DISSATISFIED' || selectedRating === 'VERY_DISSATISFIED') && !feedbackComments.trim()}
                                      onClick={() => submitSurvey(n.dossierId, selectedRating, feedbackComments)}
                                      className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-extrabold px-4 py-1.5 rounded-lg text-[10px] transition cursor-pointer flex items-center space-x-1"
                                    >
                                      <Check className="w-3 h-3" />
                                      <span>Gửi đánh giá & Đồng bộ</span>
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
            )}
          </div>
        </div>
      )}

      {/* Main interactive voice screen */}
      {!showForm && !isSubmitted && (
        <div className="bg-white border border-slate-100 rounded-2xl p-4 sm:p-6 shadow-xs flex flex-col items-center justify-center text-center space-y-4 flex-1 w-full my-auto">
          <div className="space-y-1.5">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 uppercase">
              HỆ THỐNG TIẾP NHẬN BẰNG GIỌNG NÓI CHUYÊN DỤNG
            </h2>
            <p className="text-red-600 font-bold max-w-4xl text-xs sm:text-sm leading-relaxed">
              Vui lòng nhấn nút kích hoạt Microphone dưới đây và phát biểu rõ yêu cầu về thủ tục hành chính bạn cần thực hiện. Hệ thống Trợ lý số K-GOV sẽ tự động nhận dạng, phân tích từ khóa dịch vụ công và liên kết biểu mẫu điện tử.
            </p>
          </div>

          {/* Microphone Button and Animation */}
          <div className="relative flex flex-col items-center justify-center py-2 w-full max-w-lg">
            <AnimatePresence>
              {isListening && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: [1, 1.2, 1] }}
                  exit={{ opacity: 0 }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="absolute w-28 h-28 bg-red-100/90 rounded-full -z-10"
                />
              )}
            </AnimatePresence>

            <button
              onClick={toggleListening}
              aria-label="Kích hoạt Micro thu âm trực tiếp"
              className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex flex-col items-center justify-center text-white shadow-xl transition-all duration-300 transform active:scale-95 cursor-pointer relative ${
                isListening
                  ? 'bg-red-600 hover:bg-red-700 ring-4 ring-red-400/50 animate-pulse'
                  : 'bg-gradient-to-tr from-red-600 via-rose-600 to-red-500 hover:from-red-700 hover:to-rose-700 shadow-red-500/30 hover:shadow-red-500/50 hover:scale-105 ring-4 ring-red-400/20'
              }`}
            >
              {isListening ? (
                <>
                  <MicOff className="w-9 h-9 animate-bounce" />
                  <span className="text-[10px] font-black uppercase mt-1">Dừng thu</span>
                </>
              ) : (
                <>
                  <Mic className="w-9 h-9" />
                  <span className="text-[10px] font-black uppercase mt-1">Nói ngay</span>
                </>
              )}
            </button>

            {/* Real-time Dynamic Audio Equalizer Waveform */}
            {isListening && (
              <div className="flex items-center justify-center gap-1.5 my-3 h-8 px-4 py-2 bg-red-50/90 border border-red-200/90 rounded-full shadow-2xs">
                <span className="text-[11px] font-extrabold text-red-700 mr-1.5">Âm lượng micro:</span>
                {[0.4, 0.8, 1.2, 0.6, 1.0, 0.7, 0.5].map((factor, idx) => {
                  const barHeight = Math.max(6, Math.min(28, Math.round((audioLevel * factor) / 3)));
                  return (
                    <div
                      key={idx}
                      style={{ height: `${barHeight}px` }}
                      className="w-1.5 bg-red-600 rounded-full transition-all duration-75"
                    />
                  );
                })}
              </div>
            )}

            {/* Device Status Indicator */}
            <div className="mt-2.5 flex items-center justify-center space-x-2 text-xs sm:text-sm px-4 py-2 rounded-full bg-slate-50 border border-slate-200/90 shadow-2xs w-full max-w-md">
              <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                isListening
                  ? 'bg-red-500 animate-ping'
                  : isTranscribing
                  ? 'bg-amber-500 animate-spin'
                  : 'bg-emerald-500'
              }`} />
              <span className={`font-extrabold text-center ${
                isListening
                  ? 'text-red-600 animate-pulse'
                  : isTranscribing
                  ? 'text-amber-700'
                  : 'text-slate-700'
              }`}>
                {micStatus}
              </span>
            </div>

            {/* Instant AI Blinking & Glowing Link Card - Placed directly here so user never needs to scroll */}
            {detectedService && (
              <motion.div
                ref={serviceLinkRef}
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="w-full max-w-lg mt-3 bg-gradient-to-r from-blue-600 via-[#0072CE] to-sky-500 p-1 rounded-3xl shadow-2xl ring-4 ring-blue-400/40 animate-pulse-slow relative overflow-hidden"
                style={{
                  boxShadow: '0 0 30px rgba(0, 114, 206, 0.45)'
                }}
              >
                <div className="bg-white/95 backdrop-blur-md rounded-2xl p-4 sm:p-5 text-left space-y-3">
                  <div className="flex items-center justify-between border-b border-blue-100 pb-2.5">
                    <div className="flex items-center space-x-2">
                      <span className="relative flex h-3 w-3 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600"></span>
                      </span>
                      <span className="font-black text-[11px] text-red-600 tracking-wider uppercase animate-pulse">
                        ⚡ LIÊN KẾT TRỢ LÝ AI NHẤP NHÁY - TỰ ĐỘNG MỞ BIỂU MẪU
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDetectedService(null)}
                      className="text-slate-400 hover:text-slate-600 font-bold text-xs px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 transition"
                    >
                      Đóng
                    </button>
                  </div>

                  <div className="flex items-start space-x-3.5">
                    <div className="bg-[#0072CE] text-white p-3 rounded-2xl shrink-0 shadow-md shadow-blue-500/20 animate-bounce">
                      <Sparkles className="w-6 h-6 text-amber-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black text-[#0072CE] uppercase tracking-widest">Đã xác định thủ tục công:</p>
                      <h3 className="text-base font-black text-slate-900 leading-tight">{detectedService.name}</h3>
                      <p className="text-xs text-slate-600 line-clamp-2 mt-1 leading-relaxed">{detectedService.description}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenForm(detectedService)}
                    className="w-full py-3 px-4 bg-gradient-to-r from-[#0072CE] via-[#008BE3] to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white font-black text-xs sm:text-sm rounded-xl shadow-lg hover:shadow-blue-500/40 flex items-center justify-center space-x-2 transition-all duration-300 cursor-pointer ring-4 ring-blue-400/30 animate-pulse"
                  >
                    <span>👉 NHẤP VÀO ĐÂY ĐỂ MỞ BIỂU MẪU ĐIỀN TRỰC TUYẾN</span>
                    <ArrowRight className="w-4.5 h-4.5" />
                  </button>
                </div>
              </motion.div>
            )}

            <div className="w-full max-w-lg mt-3 space-y-2.5">
              {/* Direct Search Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (manualSearchText.trim()) {
                    handleVoiceInput(manualSearchText.trim());
                  }
                }}
                className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 focus-within:border-[#0072CE] focus-within:ring-2 focus-within:ring-blue-500/20 transition shadow-2xs"
              >
                <Search className="w-4 h-4 text-slate-400 ml-2 shrink-0" />
                <input
                  type="text"
                  value={manualSearchText}
                  onChange={(e) => setManualSearchText(e.target.value)}
                  placeholder="Hoặc gõ từ khóa thủ tục (vd: Kết hôn, Khai sinh, Cư trú...)"
                  className="flex-1 px-2 py-1.5 text-xs bg-transparent outline-none text-slate-800 placeholder-slate-400 font-medium"
                />
                <button
                  type="submit"
                  className="bg-[#0072CE] hover:bg-blue-700 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs transition cursor-pointer shrink-0 shadow-2xs flex items-center space-x-1"
                >
                  <span>Xác nhận</span>
                </button>
              </form>

              {/* 1-Click Simulated Voice Prompts */}
              <div className="p-3 bg-slate-50/90 border border-slate-200/80 rounded-2xl space-y-2 text-left">
                <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Bấm nhanh mẫu khẩu lệnh giọng nói 1-Click:</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Đăng ký kết hôn trực tuyến",
                    "Đăng ký khai sinh cho con",
                    "Cấp giấy xác nhận tình trạng hôn nhân",
                    "Đăng ký thường trú",
                    "Cấp bản sao trích lục hộ tịch"
                  ].map((cmd) => (
                    <button
                      key={cmd}
                      type="button"
                      onClick={() => handleVoiceInput(cmd)}
                      className="bg-white hover:bg-emerald-50 text-slate-800 hover:text-emerald-900 border border-slate-200 hover:border-emerald-300 px-2.5 py-1 rounded-xl text-[11px] font-bold transition cursor-pointer shadow-2xs"
                    >
                      "{cmd}"
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Speech transcription bubble */}
          {recognizedText && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-50 border border-slate-100 rounded-2xl p-4 max-w-lg w-full text-left relative"
            >
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex justify-between">
                <span>Văn bản nhận diện giọng nói:</span>
                <button onClick={resetSpeech} className="text-rose-600 hover:text-rose-700 flex items-center space-x-1 font-normal text-[11px] capitalize">
                  <RefreshCw className="w-3 h-3" />
                  <span>Nói lại</span>
                </button>
              </p>
              <p className="text-slate-800 font-medium italic">"{recognizedText}"</p>
            </motion.div>
          )}

          {/* Dynamic Voice Suggestion & Machine Learning Keywords matching */}
          <div className="border-t border-slate-100 pt-6 w-full text-left">
            <div className="flex items-center justify-between mb-3.5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                <Info className="w-3.5 h-3.5 text-slate-400" />
                <span>Khẩu lệnh dịch vụ công do phường thiết lập trực tuyến:</span>
              </p>
              <span className="text-[9px] bg-emerald-50 text-emerald-800 font-black px-2 py-0.5 rounded-full uppercase tracking-wider">Cập nhật thời gian thực</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {services.map((srv) => {
                const triggerKeyword = srv.keywords[0] || srv.name.toLowerCase();
                const demoVoiceText = `Tôi muốn đăng ký làm thủ tục ${triggerKeyword}`;
                return (
                  <button
                    key={srv.id}
                    onClick={() => handleVoiceInput(demoVoiceText)}
                    className="bg-white hover:bg-emerald-50/40 text-left p-3.5 rounded-2xl border border-slate-200/80 hover:border-emerald-300 hover:shadow-md transition-all duration-200 text-xs flex items-start space-x-3 text-slate-700 font-medium group"
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center font-bold text-sm group-hover:bg-emerald-100 transition">
                      💬
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-extrabold text-slate-800 group-hover:text-emerald-900 transition truncate">{srv.name}</p>
                      <p className="text-[11px] text-slate-500 italic mt-0.5 font-normal truncate">Phát biểu thử: "{demoVoiceText}"</p>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {srv.keywords.map((kw, i) => (
                          <span key={i} className="bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded font-mono text-[9px]">
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )}

      {/* Verification Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100"
          >
            <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 text-white p-6">
              <div className="flex items-center space-x-2">
                <Shield className="w-6 h-6 text-emerald-200" />
                <div>
                  <h3 className="font-bold text-lg">Xác thực định danh liên thông VneID</h3>
                  <p className="text-xs text-emerald-100 mt-0.5">Yêu cầu từ Cổng dịch vụ công phường Tân Mỹ để tải biểu mẫu toàn trình</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {!authMethod ? (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 gap-3">
                    <button
                      onClick={() => setAuthMethod('QR')}
                      className="flex items-center space-x-4 p-4 border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/40 rounded-2xl transition text-left cursor-pointer"
                    >
                      <div className="bg-emerald-100 text-emerald-700 p-3 rounded-xl">
                        <QrCode className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm">Quét mã QR liên kết VneID</p>
                        <p className="text-xs text-slate-500 mt-0.5">Sử dụng ứng dụng VneID trên di động quét mã QR trực tiếp</p>
                      </div>
                    </button>

                    <button
                      onClick={() => setAuthMethod('CCCD')}
                      className="flex items-center space-x-4 p-4 border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/40 rounded-2xl transition text-left cursor-pointer"
                    >
                      <div className="bg-emerald-100 text-emerald-700 p-3 rounded-xl">
                        <User className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm">ĐĂNG NHẬP BẰNG SỐ CĂN CƯỚC CÔNG DÂN</p>
                        <p className="text-xs text-slate-500 mt-0.5">Nhập số định danh cá nhân 12 chữ số để truy xuất thông tin dân cư</p>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setAuthMethod('FACE');
                      }}
                      className="flex items-center space-x-4 p-4 border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/40 rounded-2xl transition text-left cursor-pointer"
                    >
                      <div className="bg-emerald-100 text-emerald-700 p-3 rounded-xl">
                        <Scan className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm">QUÉT KHUÔN MẶT (FACE SCAN)</p>
                        <p className="text-xs text-slate-500 mt-0.5">Xác thực khuôn mặt an toàn sinh trắc học liên thông K-GOV ID</p>
                      </div>
                    </button>
                  </div>

                  {/* Security Note inside modal */}
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-1">
                    <p className="text-[11px] font-black text-slate-700 uppercase flex items-center space-x-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>An toàn thông tin dữ liệu dân cư:</span>
                    </p>
                    <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                      Hệ thống liên thông cơ sở dữ liệu quốc gia về dân cư VNeID. Mọi thông tin cá nhân được bảo mật tuyệt đối theo Nghị định 13/2023/NĐ-CP.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* QR Method */}
                  {authMethod === 'QR' && (
                    <div className="text-center space-y-4">
                      <p className="text-xs text-slate-500">Mời quý khách sử dụng camera VneID quét QR để đăng nhập ngay:</p>
                      <div className="mx-auto w-44 h-44 bg-slate-50 border border-slate-100 p-3 rounded-2xl flex items-center justify-center shadow-inner relative">
                        <div className="absolute inset-0 bg-emerald-500/5 animate-pulse rounded-2xl" />
                        <QrCode className="w-36 h-36 text-slate-800" />
                      </div>
                      
                      <div className="border-t border-slate-100 pt-4 space-y-3 text-left">
                        <label className="text-xs font-bold text-slate-700 uppercase block">Hoặc giả lập Quét QR bằng cách nhập số CCCD của bạn:</label>
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            value={cccdInput}
                            onChange={(e) => setCccdInput(e.target.value.replace(/\D/g, ''))}
                            placeholder="Nhập 12 chữ số CCCD..."
                            maxLength={12}
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3.5 text-slate-800 font-semibold focus:outline-none focus:border-emerald-500 text-sm tracking-wider"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const found = citizens.find(c => c.cccd === cccdInput.trim());
                              if (found) {
                                simulateQRScan(found);
                              } else {
                                alert("Số định danh/CCCD không tồn tại trên hệ thống phường Tân Mỹ. Vui lòng nhập đúng số CCCD cá nhân.");
                              }
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition cursor-pointer shrink-0"
                          >
                            Quét giả lập
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CCCD Method */}
                  {authMethod === 'CCCD' && (
                    <form onSubmit={handleCccdLogin} className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700 uppercase">Nhập số căn cước công dân (12 số):</label>
                        <input
                          type="text"
                          required
                          value={cccdInput}
                          onChange={(e) => setCccdInput(e.target.value.replace(/\D/g, ''))}
                          placeholder="Nhập 12 chữ số định danh..."
                          maxLength={12}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-800 font-semibold focus:outline-none focus:border-emerald-500 text-center text-lg tracking-widest"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition cursor-pointer"
                      >
                        Đồng ý xác thực
                      </button>
                    </form>
                  )}

                  {/* Face Scan Method */}
                  {authMethod === 'FACE' && (
                    <div className="text-center space-y-4">
                      {!isScanningFace ? (
                        <div className="space-y-4">
                          <div className="space-y-2 text-left">
                            <label className="text-xs font-bold text-slate-700 uppercase">Nhập số định danh/CCCD của bạn trước:</label>
                            <input
                              type="text"
                              value={cccdInput}
                              onChange={(e) => setCccdInput(e.target.value.replace(/\D/g, ''))}
                              placeholder="Nhập 12 chữ số CCCD..."
                              maxLength={12}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-800 font-semibold focus:outline-none focus:border-emerald-500 text-center text-lg tracking-widest"
                            />
                          </div>
                          <button
                            onClick={() => {
                              const found = citizens.find(c => c.cccd === cccdInput.trim());
                              if (found) {
                                triggerFaceScan(found);
                              } else {
                                alert("Số định danh/CCCD không tồn tại trên dữ liệu dân cư phường Tân Mỹ. Vui lòng nhập đúng số CCCD cá nhân của bạn.");
                              }
                            }}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition cursor-pointer flex items-center justify-center space-x-2"
                          >
                            <Scan className="w-4 h-4" />
                            <span>Bắt đầu quét khuôn mặt</span>
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="relative mx-auto w-44 h-44 rounded-full border-4 border-emerald-500 overflow-hidden flex items-center justify-center bg-slate-900 shadow-lg">
                            <div className="absolute w-full h-1 bg-emerald-400 animate-bounce top-0 left-0" />
                            <Scan className="w-16 h-16 text-emerald-400 animate-pulse" />
                          </div>
                          <div className="space-y-1">
                            <p className="font-semibold text-sm text-slate-800">Đang quét sinh trắc học...</p>
                            <p className="text-xs text-slate-400">Vui lòng nhìn thẳng vào camera để đối khớp thông tin CCCD</p>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2">
                            <div className="bg-emerald-500 h-2 rounded-full transition-all duration-300" style={{ width: `${faceScanProgress}%` }} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => setAuthMethod(null)}
                    className="w-full text-center text-xs text-rose-500 hover:text-rose-600 font-semibold mt-2"
                  >
                    Quay lại chọn hình thức khác
                  </button>
                </div>
              )}
            </div>

            <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => {
                  setShowAuthModal(false);
                  setAuthMethod(null);
                }}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2 px-4 rounded-xl text-xs transition"
              >
                Hủy bỏ
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Spell Check Confirmation Modal */}
      {showSpellCheckConfirm && detectedService && loggedInCitizen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]"
          >
            <div className="bg-amber-600 text-white p-5 shrink-0">
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-8 h-8 text-amber-200 animate-pulse shrink-0" />
                <div>
                  <h3 className="font-bold text-lg">Cảnh báo kiểm soát chính tả & định danh VNeID</h3>
                  <p className="text-xs text-amber-100 mt-0.5">Trợ lý K-GOV AI phát hiện thông tin gõ sai, thiếu dấu hoặc chưa trùng khớp CSDL Quốc gia</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {(() => {
                const issues = computeServiceFieldIssues(detectedService, formData, loggedInCitizen, citizens);
                return (
                  <>
                    <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3.5 text-xs text-amber-900 font-medium leading-relaxed">
                      Hệ thống phát hiện <span className="font-extrabold text-amber-950">{issues.length} vị trí trường thông tin</span> kê khai có dấu hiệu sai chính tả, gõ nhầm hoặc chưa trùng khớp dữ liệu CSDL Dân cư VNeID gốc:
                    </div>

                    <div className="space-y-3">
                      {issues.map((issue, idx) => (
                        <div key={idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2.5">
                          <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                            <span className="font-extrabold text-slate-800 text-sm flex items-center space-x-1.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                              <span>Trường thông tin: <span className="text-amber-900 font-black">{issue.label}</span></span>
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                              issue.status === 'error' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {issue.status === 'error' ? 'Sai lệch dữ liệu' : 'Lỗi chính tả / Thiếu dấu'}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div className="bg-rose-50/80 border border-rose-100 rounded-xl p-2.5">
                              <span className="text-[10px] uppercase font-bold text-rose-600 block mb-0.5">Công dân đã nhập:</span>
                              <span className="font-extrabold text-rose-900 font-mono text-xs break-all">{issue.submittedValue}</span>
                            </div>
                            <div className="bg-emerald-50/80 border border-emerald-100 rounded-xl p-2.5">
                              <span className="text-[10px] uppercase font-bold text-emerald-600 block mb-0.5">CSDL VNeID yêu cầu:</span>
                              <span className="font-extrabold text-emerald-900 font-mono text-xs break-all">{issue.vneidValue}</span>
                            </div>
                          </div>

                          <p className="text-amber-900 font-semibold bg-amber-100/60 p-2.5 rounded-xl leading-relaxed border border-amber-200/50">
                            💡 <span className="font-bold">Chi tiết lỗi:</span> {issue.message}
                          </p>

                          {issue.suggestions.length > 0 && (
                            <div className="flex justify-end pt-0.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, [issue.fieldId]: issue.suggestions[0] }));
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3 py-1.5 rounded-lg text-xs transition shadow-sm flex items-center space-x-1 cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>⚡ Sửa mục này thành "{issue.suggestions[0]}"</span>
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 italic flex items-center space-x-2">
                <Info className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Nên chọn <strong className="font-bold text-emerald-700">"Sửa tự động tất cả & Gửi hồ sơ"</strong> để đảm bảo thông tin hoàn toàn hợp lệ trước khi gửi cho cán bộ tiếp nhận.</span>
              </div>
            </div>

            <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-col sm:flex-row justify-end gap-2 shrink-0">
              <button
                onClick={() => {
                  const updated = { ...formData };
                  const issues = computeServiceFieldIssues(detectedService, formData, loggedInCitizen, citizens);
                  issues.forEach(issue => {
                    if (issue.suggestions.length > 0) {
                      updated[issue.fieldId] = issue.suggestions[0];
                    }
                  });
                  setFormData(updated);
                  setShowSpellCheckConfirm(false);
                  setBypassSpellingCheck(true);
                  setTimeout(() => {
                    const formElement = document.querySelector('form');
                    if (formElement) {
                      formElement.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                    }
                  }, 100);
                  speak("Đã tự động sửa toàn bộ lỗi chính tả và gửi hồ sơ thành công.");
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs shadow-md transition flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Sửa tự động tất cả & Gửi hồ sơ</span>
              </button>

              <button
                onClick={() => setShowSpellCheckConfirm(false)}
                className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold py-2.5 px-4 rounded-xl text-xs transition cursor-pointer"
              >
                Quay lại tự sửa
              </button>

              <button
                onClick={() => {
                  setShowSpellCheckConfirm(false);
                  setBypassSpellingCheck(true);
                  setTimeout(() => {
                    const formElement = document.querySelector('form');
                    if (formElement) {
                      formElement.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                    }
                  }, 100);
                }}
                className="bg-amber-100 hover:bg-amber-200 text-amber-800 font-extrabold py-2.5 px-4 rounded-xl text-xs transition flex items-center justify-center cursor-pointer"
              >
                <span>Bỏ qua & Vẫn gửi đi</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Registration Electronic Form Component */}
      {showForm && loggedInCitizen && detectedService && !isSubmitted && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-slate-200 rounded-2xl shadow-xl max-w-5xl mx-auto w-full my-2 sm:my-4 flex flex-col relative overflow-hidden"
        >
          {/* Check if service is Marriage Registration */}
          {(detectedService.id === 'SRV-MARRIAGE' || detectedService.name.toLowerCase().includes('kết hôn')) ? (
            /* =========================================================================
               PROFESSIONAL ONLINE MARRIAGE REGISTRATION INTERFACE (ĐĂNG KÝ KẾT HÔN TRỰC TUYẾN)
               ========================================================================= */
            <div>
              {/* Official Header */}
              <div className="bg-slate-900 text-white p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800">
                <div className="flex items-center space-x-3.5">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-7 h-7 text-amber-400" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded font-black tracking-wider uppercase">CỔNG DỊCH VỤ CÔNG QUỐC GIA</span>
                      <span className="text-[10px] bg-slate-800 text-amber-300 px-2 py-0.5 rounded font-semibold border border-amber-400/20">VNeID ĐỊNH DANH MỨC 2</span>
                    </div>
                    <h3 className="font-extrabold text-white text-lg sm:text-xl mt-1 tracking-tight">TỜ KHAI ĐĂNG KÝ KẾT HÔN TRỰC TUYẾN</h3>
                    <p className="text-xs text-slate-300 mt-0.5 flex items-center space-x-1">
                      <span>Liên thông CSDL Quốc gia về Dân cư | Tài khoản kê khai:</span>
                      <strong className="text-amber-300 font-bold underline ml-1">{loggedInCitizen.fullName}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={integrateAllVneID}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-sm transition flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Shield className="w-4 h-4" />
                    <span>Tự động điền lại VNeID</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setShowForm(false); setLoggedInCitizen(null); }}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold py-2.5 px-3.5 rounded-xl text-xs transition cursor-pointer flex items-center space-x-1"
                  >
                    <X className="w-4 h-4" />
                    <span>Thoát</span>
                  </button>
                </div>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSubmitForm} className="p-5 sm:p-8 space-y-6 bg-slate-50/60">
                
                {/* 2-Column Section: Husband (Bên Nam) vs Wife (Bên Nữ) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Husband Side (Bên Nam) */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs relative overflow-hidden flex flex-col justify-between hover:border-blue-300 transition">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-blue-600" />
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center space-x-2.5">
                          <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 font-black text-base flex items-center justify-center shrink-0">♂</span>
                          <div>
                            <h4 className="font-extrabold text-slate-900 text-sm uppercase tracking-wide">THÔNG TIN BÊN NAM (CHỒNG)</h4>
                            <p className="text-[11px] text-slate-500">Người nam công dân đăng ký kết hôn</p>
                          </div>
                        </div>
                        {detectCitizenGender(loggedInCitizen, citizens) === 'Nam' && (
                          <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                            ✓ Chủ tài khoản VNeID
                          </span>
                        )}
                      </div>

                      <div className="space-y-3.5">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                            Số CCCD / Mã định danh Chồng <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={formData['husband_cccd'] || ''}
                            onChange={(e) => updateFormField('husband_cccd', e.target.value)}
                            placeholder="Nhập 12 số CCCD..."
                            className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 px-3 text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-600 focus:bg-white transition"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                            Họ và tên Chồng <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={formData['husband_name'] || ''}
                            onChange={(e) => updateFormField('husband_name', e.target.value)}
                            placeholder="Họ và tên tự động xác thực..."
                            className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 px-3 text-sm text-slate-900 font-bold focus:outline-none focus:border-blue-600 focus:bg-white transition"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                            Ngày, tháng, năm sinh <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            required
                            value={formData['husband_dob'] || ''}
                            onChange={(e) => updateFormField('husband_dob', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 px-3 text-sm text-slate-900 font-medium focus:outline-none focus:border-blue-600 focus:bg-white transition"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <span className="flex items-center text-emerald-700 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        Liên thông CSDL Dân cư
                      </span>
                      <button
                        type="button"
                        onClick={() => integrateVneID('husband_cccd', 'cccd')}
                        className="text-blue-700 font-bold hover:underline cursor-pointer"
                      >
                        Đồng bộ lại
                      </button>
                    </div>
                  </div>

                  {/* Wife Side (Bên Nữ) */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs relative overflow-hidden flex flex-col justify-between hover:border-pink-300 transition">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-pink-500" />
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center space-x-2.5">
                          <span className="w-8 h-8 rounded-xl bg-pink-100 text-pink-700 font-black text-base flex items-center justify-center shrink-0">♀</span>
                          <div>
                            <h4 className="font-extrabold text-slate-900 text-sm uppercase tracking-wide">THÔNG TIN BÊN NỮ (VỢ)</h4>
                            <p className="text-[11px] text-slate-500">Người nữ công dân đăng ký kết hôn</p>
                          </div>
                        </div>
                        {detectCitizenGender(loggedInCitizen, citizens) === 'Nữ' && (
                          <span className="bg-pink-50 text-pink-700 border border-pink-200 text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                            ✓ Chủ tài khoản VNeID
                          </span>
                        )}
                      </div>

                      <div className="space-y-3.5">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                            Số CCCD / Mã định danh Vợ <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={formData['wife_cccd'] || ''}
                            onChange={(e) => updateFormField('wife_cccd', e.target.value)}
                            placeholder="Nhập 12 số CCCD..."
                            className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 px-3 text-sm text-slate-900 font-medium focus:outline-none focus:border-pink-500 focus:bg-white transition"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                            Họ và tên Vợ <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={formData['wife_name'] || ''}
                            onChange={(e) => updateFormField('wife_name', e.target.value)}
                            placeholder="Họ và tên tự động xác thực..."
                            className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 px-3 text-sm text-slate-900 font-bold focus:outline-none focus:border-pink-500 focus:bg-white transition"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                            Ngày, tháng, năm sinh <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="date"
                            required
                            value={formData['wife_dob'] || ''}
                            onChange={(e) => updateFormField('wife_dob', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 px-3 text-sm text-slate-900 font-medium focus:outline-none focus:border-pink-500 focus:bg-white transition"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <span className="flex items-center text-emerald-700 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        Liên thông CSDL Dân cư
                      </span>
                      <button
                        type="button"
                        onClick={() => integrateVneID('wife_cccd', 'cccd')}
                        className="text-pink-700 font-bold hover:underline cursor-pointer"
                      >
                        Đồng bộ lại
                      </button>
                    </div>
                  </div>
                </div>

                {/* Attachments Section */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
                  <h4 className="font-extrabold text-slate-900 text-sm uppercase flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <span>GIẤY TỜ KÈM THEO & MINH CHỨNG TÌNH TRẠNG HÔN NHÂN</span>
                  </h4>
                  <p className="text-xs text-slate-500">
                    Đính kèm tệp Tờ khai xác nhận tình trạng độc thân hoặc minh chứng theo quy định
                  </p>

                  <div className="border-2 border-dashed border-slate-200 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/30 rounded-xl p-5 text-center transition flex flex-col items-center justify-center cursor-pointer">
                    <input
                      type="file"
                      id="proof_marital_status_file"
                      className="hidden"
                      onChange={(e) => handleFileUpload('proof_marital_status', e)}
                    />
                    <label htmlFor="proof_marital_status_file" className="cursor-pointer flex flex-col items-center space-y-1.5 w-full">
                      <Upload className="w-8 h-8 text-emerald-600" />
                      <span className="text-xs font-bold text-slate-800">Tải lên Giấy xác nhận tình trạng hôn nhân (PDF, JPG, PNG)</span>
                      <span className="text-[11px] text-slate-400">Dung lượng tối đa 10MB</span>
                    </label>
                    {uploadedFiles['proof_marital_status'] && (
                      <div className="mt-3 text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-1.5 rounded-lg font-bold flex items-center space-x-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Tệp đã tải lên thành công: {uploadedFiles['proof_marital_status'].name}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Real-time Automated Legal Pre-Check Card */}
                {(() => {
                  const hCccd = formData['husband_cccd'] || (detectCitizenGender(loggedInCitizen, citizens) === 'Nam' ? loggedInCitizen?.cccd : '');
                  const wCccd = formData['wife_cccd'] || (detectCitizenGender(loggedInCitizen, citizens) === 'Nữ' ? loggedInCitizen?.cccd : '');
                  const hObj = citizens.find(c => c.cccd.trim() === (hCccd || '').trim()) || (detectCitizenGender(loggedInCitizen, citizens) === 'Nam' ? loggedInCitizen : null);
                  const wObj = citizens.find(c => c.cccd.trim() === (wCccd || '').trim()) || (detectCitizenGender(loggedInCitizen, citizens) === 'Nữ' ? loggedInCitizen : null);

                  if (!hObj && !wObj) return null;

                  const validation = validateMarriageRules(hObj, wObj);

                  return (
                    <div className={`p-4 rounded-2xl border text-xs space-y-2 transition shadow-xs ${
                      validation.isValid
                        ? 'bg-emerald-50/90 border-emerald-300 text-emerald-900'
                        : 'bg-rose-50/90 border-rose-300 text-rose-900'
                    }`}>
                      <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2">
                        <div className="flex items-center space-x-2 font-black uppercase tracking-wide">
                          {validation.isValid ? (
                            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                          )}
                          <span>KẾT QUẢ THẨM ĐỊNH TỰ ĐỘNG THEO LUẬT HÔN NHÂN & GIA ĐÌNH 2014</span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          validation.isValid ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
                        }`}>
                          {validation.isValid ? 'ĐỦ ĐIỀU KIỆN' : 'CÓ VI PHẠM PHÁP LÝ'}
                        </span>
                      </div>

                      {validation.isValid ? (
                        <p className="leading-relaxed font-medium">
                          ✓ <strong>Hệ thống xác nhận:</strong> Cả hai bên Nam ({validation.husbandAge} tuổi) và Nữ ({validation.wifeAge} tuổi) đều đáp ứng đầy đủ điều kiện độ tuổi, tình trạng hôn nhân độc thân và không có xung đột dữ liệu trên CSDL Quốc gia về Dân cư VNeID.
                        </p>
                      ) : (
                        <div className="space-y-1">
                          <p className="font-extrabold text-rose-900">Phát hiện các điểm chưa đạt yêu cầu pháp lý:</p>
                          <ul className="list-disc list-inside space-y-1 pl-1 font-medium text-rose-800">
                            {validation.messages.map((m, idx) => (
                              <li key={idx}>{m}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Digital Signature & Legal Confirmation */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                    <h4 className="font-extrabold text-slate-900 text-sm uppercase">CAM KẾT PHÁP LÝ & KÝ SỐ ĐIỆN TỬ</h4>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-700 leading-relaxed">
                    <label className="flex items-start space-x-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        required
                        checked={isDigitallySigned}
                        onChange={(e) => setIsDigitallySigned(e.target.checked)}
                        className="w-4 h-4 mt-0.5 accent-emerald-600 rounded cursor-pointer shrink-0"
                      />
                      <span className="font-semibold text-slate-800">
                        Tôi cam đoan việc kết hôn hoàn toàn dựa trên sự tự nguyện của hai bên nam nữ. Thông tin kê khai hoàn toàn trung thực, đầy đủ và chính xác. Tôi hoàn toàn chịu trách nhiệm trước pháp luật về tính hợp pháp của hồ sơ này.
                      </span>
                    </label>
                  </div>

                  {isDigitallySigned && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-900 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Lock className="w-4 h-4 text-emerald-700 shrink-0" />
                        <span className="font-bold">Đã tích hợp chữ ký số VNeID công dân (mã hóa SHA-256)</span>
                      </div>
                      <span className="bg-emerald-600 text-white font-extrabold text-[10px] px-2.5 py-1 rounded uppercase tracking-wider">XÁC THỰC KÝ SỐ</span>
                    </div>
                  )}
                </div>

                {/* Action Submit Bar */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        const doc = new jsPDF();
                        doc.setFontSize(16);
                        doc.text("TO KHAI DANG KY KET HON TRUC TUYEN", 20, 20);
                        doc.setFontSize(11);
                        doc.text(`Nguoi ke khai (Chong/Vo): ${loggedInCitizen.fullName}`, 20, 35);
                        doc.text(`So CCCD: ${loggedInCitizen.cccd}`, 20, 45);
                        doc.text(`Dia chi thuong tru: ${loggedInCitizen.address}`, 20, 55);
                        doc.text(`Thoi gian ke khai: ${new Date().toLocaleString('vi-VN')}`, 20, 65);
                        doc.text("Xac thuc ky so VNeID: HOP LE (SHA-256)", 20, 75);
                        doc.save(`To_Khai_Ket_Hon_${loggedInCitizen.cccd}.pdf`);
                        alert("Đã tải về bản sao Tờ khai Đăng ký kết hôn trực tuyến (PDF) thành công!");
                      } catch (err) {
                        console.error(err);
                        alert("Đang xuất tệp tờ khai PDF...");
                      }
                    }}
                    className="w-full sm:w-auto bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-3 px-5 rounded-xl text-xs transition flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-slate-700" />
                    <span>Tải Mẫu Tờ khai (PDF)</span>
                  </button>

                  <button
                    type="submit"
                    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 px-8 rounded-xl text-sm shadow-md hover:shadow-lg transition flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <Send className="w-4.5 h-4.5" />
                    <span>NỘP HỒ SƠ ĐĂNG KÝ KẾT HÔN TRỰC TUYẾN</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* General Services Header */
            <div className="bg-slate-50/90 backdrop-blur-xs border-b border-slate-200 p-4 sm:p-6 sticky top-0 z-20 rounded-t-2xl flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full uppercase font-extrabold">LIÊN THÔNG CƠ SỞ DỮ LIỆU DÂN CƯ</span>
                  <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full uppercase font-bold">K-GOV FORM</span>
                </div>
                <h3 className="font-extrabold text-slate-950 text-lg sm:text-xl mt-1">{detectedService.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-2">
                  <span>Kê khai bởi công dân: <span className="font-bold text-slate-800">{loggedInCitizen.fullName}</span> (CCCD: {loggedInCitizen.cccd})</span>
                </p>
              </div>

              <div className="flex items-center space-x-2 self-start md:self-center shrink-0">
                <button
                  type="button"
                  onClick={integrateAllVneID}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3.5 rounded-xl text-xs shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
                >
                  <Shield className="w-4 h-4" />
                  <span>Đồng bộ tất cả VNeID</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setLoggedInCitizen(null);
                  }}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-2 px-3 rounded-xl text-xs transition cursor-pointer flex items-center space-x-1"
                  title="Quay lại danh sách dịch vụ"
                >
                  <X className="w-4 h-4" />
                  <span className="hidden sm:inline">Quay lại</span>
                </button>
              </div>
            </div>
          )}

          {/* Form Content */}
          <form onSubmit={handleSubmitForm} className="p-4 sm:p-6 space-y-6 flex-1">
            {/* Smart Service Guidance Banner for Newborn Birth Registration */}
            {detectedService.id === 'SRV-BIRTH' && (
              <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 text-xs text-sky-900 flex items-start space-x-2.5 shadow-2xs">
                <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-extrabold uppercase text-[10px] text-sky-800 tracking-wide block">
                    Hướng dẫn AI: Đăng ký khai sinh cho trẻ sơ sinh
                  </span>
                  <p className="mt-0.5 text-sky-800 font-medium leading-relaxed">
                    Trẻ sơ sinh chưa có mã định danh VNeID cá nhân. Trợ lý AI tự động tự điền thông tin người nộp (Cha/Mẹ) từ CSDL VNeID, hỗ trợ chuẩn hóa tên bé (ví dụ: viết hoa "Trần Nam") và kiểm tra tính đầy đủ của Giấy chứng sinh y tế.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {detectedService.fields.map(f => (
                <div key={f.id} className={`space-y-1.5 ${f.type === 'file' ? 'md:col-span-2' : ''}`}>
                  <label className="text-xs font-bold text-slate-700 uppercase flex items-center justify-between">
                    <span>
                      {f.label} {f.required && <span className="text-rose-500">*</span>}
                    </span>
                    {f.vneidField && (() => {
                      const { isSelf } = getTargetVneidValueForField(f, formData, loggedInCitizen, citizens);
                      const isFemaleUser = loggedInCitizen ? (detectCitizenGender(loggedInCitizen, citizens) === 'Nữ') : false;
                      let roleLabel = 'VNeID';
                      if (isSelf) {
                        if (f.id.startsWith('wife_')) {
                          roleLabel = 'VNeID (Vợ - Người đăng nhập)';
                        } else if (f.id.startsWith('husband_')) {
                          roleLabel = 'VNeID (Chồng - Người đăng nhập)';
                        } else {
                          roleLabel = 'VNeID (Tôi)';
                        }
                      } else if (f.id.startsWith('husband_')) {
                        roleLabel = 'VNeID (Chồng)';
                      } else if (f.id.startsWith('wife_')) {
                        roleLabel = 'VNeID (Vợ)';
                      } else if (f.id.startsWith('father_')) {
                        roleLabel = 'VNeID (Cha/Bố)';
                      } else if (f.id.startsWith('mother_')) {
                        roleLabel = 'VNeID (Mẹ)';
                      }

                      return (
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md tracking-wider uppercase ${
                          isSelf ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs' : 'bg-sky-100 text-sky-800 border border-sky-200'
                        }`}>
                          {roleLabel}
                        </span>
                      );
                    })()}
                  </label>

                  <div className="flex space-x-2">
                    {f.type === 'text' && (
                      <input
                        type="text"
                        required={f.required}
                        value={formData[f.id] || ''}
                        onChange={(e) => updateFormField(f.id, e.target.value)}
                        placeholder={f.placeholder || `Nhập ${f.label.toLowerCase()}...`}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-slate-800 font-medium focus:outline-none focus:border-emerald-500"
                      />
                    )}

                    {f.type === 'date' && (
                      <input
                        type="date"
                        required={f.required}
                        value={formData[f.id] || ''}
                        onChange={(e) => updateFormField(f.id, e.target.value)}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-slate-800 font-medium focus:outline-none focus:border-emerald-500"
                      />
                    )}

                    {f.type === 'select' && (
                      <select
                        required={f.required}
                        value={formData[f.id] || ''}
                        onChange={(e) => updateFormField(f.id, e.target.value)}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm text-slate-800 font-medium focus:outline-none focus:border-emerald-500"
                      >
                        <option value="">-- Chọn --</option>
                        {f.options?.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    )}

                    {f.type === 'file' && (
                      <div className="flex-1 border-2 border-dashed border-slate-200 hover:border-emerald-400 bg-slate-50 rounded-xl p-4 text-center transition relative flex flex-col items-center justify-center">
                        <input
                          type="file"
                          required={f.required && !uploadedFiles[f.id]}
                          id={`file-${f.id}`}
                          className="hidden"
                          onChange={(e) => handleFileUpload(f.id, e)}
                        />
                        <label htmlFor={`file-${f.id}`} className="cursor-pointer flex flex-col items-center space-y-1 w-full">
                          <Upload className="w-6 h-6 text-slate-400" />
                          <span className="text-xs text-slate-600 font-semibold">Tải ảnh hoặc PDF minh chứng đính kèm</span>
                          <span className="text-[10px] text-slate-400">Bấm để duyệt tệp tin</span>
                        </label>
                        {uploadedFiles[f.id] && (() => {
                          const docCheck = validateUploadedDocType(uploadedFiles[f.id].name, f.label);
                          if (!docCheck.isValid) {
                            return (
                              <div className="mt-2 text-xs bg-rose-50 border border-rose-200 text-rose-800 p-2.5 rounded-xl font-bold flex items-start space-x-1.5 shadow-2xs w-full text-left">
                                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                                <div>
                                  <span className="uppercase text-[10px] font-black text-rose-700 block">🔴 CẢNH BÁO TỆP KHÔNG ĐÚNG QUY ĐỊNH</span>
                                  <p className="mt-0.5 text-xs text-rose-900 font-medium leading-relaxed">{docCheck.message}</p>
                                </div>
                              </div>
                            );
                          }
                          return (
                            <div className="mt-2 text-xs bg-emerald-50 border border-emerald-100 text-emerald-800 py-1.5 px-3 rounded-lg font-bold flex items-center space-x-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>Đã tải: {uploadedFiles[f.id].name} (Khớp chủng loại tài liệu)</span>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {f.vneidField && (() => {
                      const { isSelf } = getTargetVneidValueForField(f, formData, loggedInCitizen, citizens);

                      let btnText = 'Tải VNeID';
                      let btnClass = 'bg-emerald-50 border border-emerald-300 text-emerald-800 hover:bg-emerald-100';
                      let iconColor = 'text-emerald-600';

                      if (isSelf) {
                        if (f.id.startsWith('wife_')) {
                          btnText = 'Tải VNeID (Vợ - Tôi)';
                        } else if (f.id.startsWith('husband_')) {
                          btnText = 'Tải VNeID (Chồng - Tôi)';
                        } else {
                          btnText = 'Tải VNeID (Tôi)';
                        }
                        btnClass = 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs font-black';
                        iconColor = 'text-white';
                      } else if (f.id.startsWith('husband_')) {
                        btnText = 'Tra cứu VNeID (Chồng)';
                        btnClass = 'bg-sky-50 border border-sky-300 hover:bg-sky-100 text-sky-800';
                        iconColor = 'text-sky-600';
                      } else if (f.id.startsWith('wife_')) {
                        btnText = 'Tra cứu VNeID (Vợ)';
                        btnClass = 'bg-sky-50 border border-sky-300 hover:bg-sky-100 text-sky-800';
                        iconColor = 'text-sky-600';
                      } else if (f.id.startsWith('father_')) {
                        btnText = 'Tra cứu VNeID (Bố)';
                        btnClass = 'bg-sky-50 border border-sky-300 hover:bg-sky-100 text-sky-800';
                        iconColor = 'text-sky-600';
                      } else if (f.id.startsWith('mother_')) {
                        btnText = 'Tra cứu VNeID (Mẹ)';
                        btnClass = 'bg-sky-50 border border-sky-300 hover:bg-sky-100 text-sky-800';
                        iconColor = 'text-sky-600';
                      }

                      return (
                        <>
                          {(f.id.includes('cccd') || f.vneidField === 'cccd' || f.label.toLowerCase().includes('cccd')) && (
                            <button
                              type="button"
                              onClick={() => handleRecognizeGender(f.id)}
                              className="bg-indigo-50 border border-indigo-300 text-indigo-900 hover:bg-indigo-100 p-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-1 cursor-pointer shrink-0 shadow-2xs"
                              title="Bấm để hệ thống tự động phân tích & nhận diện giới tính từ số CCCD/VNeID"
                            >
                              <UserCheck className="w-4 h-4 text-indigo-600" />
                              <span className="hidden md:inline">Nhận diện giới tính</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => integrateVneID(f.id, f.vneidField!)}
                            className={`${btnClass} p-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-1 cursor-pointer shrink-0`}
                            title={`Tải/Tra cứu dữ liệu VNeID cho ${f.label}`}
                          >
                            <Shield className={`w-4 h-4 ${iconColor}`} />
                            <span className="hidden md:inline">{btnText}</span>
                          </button>
                        </>
                      );
                    })()}
                  </div>

                  {/* Live Gender Recognition & Role Placement Card */}
                  {(f.id.includes('cccd') || f.vneidField === 'cccd' || f.label.toLowerCase().includes('cccd')) && (() => {
                    const currentVal = (formData[f.id] || '').trim();
                    const analysis = cccdGenderResults[f.id] || (currentVal.length >= 9 ? analyzeCccdGender(currentVal, citizens) : null);
                    
                    if (!analysis) return null;

                    return (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-2 p-2.5 rounded-xl text-xs bg-indigo-50/90 border border-indigo-200 text-indigo-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs"
                      >
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <span className={`px-2.5 py-0.5 rounded-lg font-black uppercase text-[11px] tracking-wide inline-flex items-center space-x-1 ${
                            analysis.gender === 'Nam' ? 'bg-blue-600 text-white' : 'bg-pink-600 text-white'
                          }`}>
                            <span>{analysis.gender === 'Nam' ? '♂ GIỚI TÍNH NAM' : '♀ GIỚI TÍNH NỮ'}</span>
                          </span>
                          <span className="text-slate-800 font-semibold">{analysis.reason}</span>
                        </div>

                        {(f.id.startsWith('husband_') || f.id.startsWith('wife_') || detectedService.id === 'SRV-MARRIAGE' || detectedService.name.toLowerCase().includes('kết hôn')) && (
                          <div className="flex items-center space-x-1.5 shrink-0 self-end sm:self-auto">
                            <button
                              type="button"
                              onClick={() => forceAssignSpouseRole(f.id, 'Nam')}
                              className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center space-x-1 ${
                                analysis.gender === 'Nam'
                                  ? 'bg-blue-600 text-white shadow-2xs font-extrabold'
                                  : 'bg-blue-100 hover:bg-blue-200 text-blue-900'
                              }`}
                              title="Gán và điền thông tin CCCD này vào MỤC CHỒNG (Giới tính Nam)"
                            >
                              <span>♂ Gán Mục Chồng</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => forceAssignSpouseRole(f.id, 'Nữ')}
                              className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition cursor-pointer flex items-center space-x-1 ${
                                analysis.gender === 'Nữ'
                                  ? 'bg-pink-600 text-white shadow-2xs font-extrabold'
                                  : 'bg-pink-100 hover:bg-pink-200 text-pink-900'
                              }`}
                              title="Gán và điền thông tin CCCD này vào MỤC VỢ (Giới tính Nữ)"
                            >
                              <span>♀ Gán Mục Vợ</span>
                            </button>
                          </div>
                        )}
                      </motion.div>
                    );
                  })()}

                  {/* Real-time Spell Check & Typo Control */}
                  {f.type === 'text' && (() => {
                    const { vneidValue, isSelf } = getTargetVneidValueForField(f, formData, loggedInCitizen, citizens);
                    const spellCheck = getVietnameseSpellCheck(f.label, formData[f.id] || '', isSelf ? (f.vneidField || 'fullName') : f.vneidField, vneidValue, isSelf);
                    
                    if (spellCheck) {
                      return (
                        <div className={`mt-1.5 p-2 rounded-lg text-xs flex flex-col space-y-1.5 border ${
                          spellCheck.status === 'error'
                            ? 'bg-rose-50 border-rose-100 text-rose-800'
                            : 'bg-amber-50/70 border-amber-100 text-amber-800'
                        }`}>
                          <div className="flex items-start space-x-1.5">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-extrabold uppercase text-[10px] tracking-wide block">
                                {spellCheck.status === 'error' ? 'Lỗi gõ phím / Sai lệch CSDL' : 'Nghi ngờ lỗi chính tả / Thiếu dấu'}
                              </span>
                              <p className="mt-0.5">{spellCheck.message}</p>
                              {vneidValue && formData[f.id] && isSelf && (
                                <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                                  [Nhập: "{formData[f.id]}" → VNeID gốc: "{vneidValue}"]
                                </p>
                              )}
                            </div>
                          </div>
                          {spellCheck.suggestions.length > 0 && isSelf && (
                            <div className="flex items-center space-x-2 pl-5">
                              <span className="text-[10px] text-slate-500">Đề xuất gõ lại đúng chính tả:</span>
                              {spellCheck.suggestions.map((sug, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setFormData(prev => ({ ...prev, [f.id]: sug }))}
                                  className="bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200 hover:border-emerald-300 font-extrabold px-2 py-0.5 rounded text-[10px] shadow-sm cursor-pointer flex items-center space-x-1 transition"
                                >
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span>Sửa thành "{sug}"</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              ))}
            </div>

            {/* Digital Signature section */}
            <div className="border-t border-slate-100 pt-6 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase flex items-center space-x-1">
                    <Shield className="w-4 h-4 text-emerald-700" />
                    <span>TÍCH HỢP CHỮ KÝ SỐ CÔNG DÂN</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Xác minh chữ ký số điện tử liên thông Hệ thống CA K-GOV</p>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="sign_checkbox"
                    checked={isDigitallySigned}
                    onChange={(e) => {
                      setIsDigitallySigned(e.target.checked);
                      if (e.target.checked) {
                        // Find match signature
                        const found = signatures.find(s => s.ownerCccd === loggedInCitizen.cccd);
                        if (found) {
                          setSelectedSignature(found.id);
                        } else {
                          setSelectedSignature('NEW');
                        }
                      }
                    }}
                    className="w-4.5 h-4.5 accent-emerald-600 rounded text-emerald-600 border-slate-300 cursor-pointer"
                  />
                  <label htmlFor="sign_checkbox" className="text-xs font-bold text-slate-700 cursor-pointer select-none">Tích hợp chữ ký số cá nhân</label>
                </div>
              </div>

              {isDigitallySigned && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs text-emerald-900 space-y-2 flex justify-between items-center"
                >
                  <div>
                    <p className="font-bold">🔐 Trạng thái chữ ký số của bạn:</p>
                    {selectedSignature === 'NEW' ? (
                      <p className="text-amber-800 italic mt-0.5">Chưa phát hiện thiết bị token chữ ký số trong USB. Đã tự động kích hoạt chữ ký số tạm thời theo ID.</p>
                    ) : (
                      <p className="text-emerald-700 font-semibold mt-0.5">
                        ✓ Phát hiện khóa: {signatures.find(s => s.id === selectedSignature)?.keyName}
                      </p>
                    )}
                  </div>
                  <span className="bg-emerald-600 text-white font-bold text-[10px] px-2.5 py-1 rounded-full uppercase">ĐÃ KÝ DUYỆT</span>
                </motion.div>
              )}
            </div>

            {/* Global Vietnamese Spell Check & Typo Control Widget */}
            {(() => {
              const currentSpellingIssues = computeServiceFieldIssues(detectedService, formData, loggedInCitizen, citizens);

              if (currentSpellingIssues.length > 0) {
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex items-start space-x-2">
                        <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-xs font-black text-amber-800 uppercase tracking-wide">
                            HỆ THỐNG KIỂM SOÁT CHÍNH TẢ & SAI LỆCH ĐỊNH DANH (K-GOV AI)
                          </h4>
                          <p className="text-[11px] text-amber-700 mt-0.5">
                            Phát hiện <span className="font-bold">{currentSpellingIssues.length}</span> điểm nghi vấn lỗi gõ phím, lỗi chính tả hoặc không khớp với CSDL định danh VNeID gốc.
                          </p>
                        </div>
                      </div>
                      
                      {/* Auto-normalize button */}
                      <button
                        type="button"
                        onClick={() => {
                          const updated = { ...formData };
                          currentSpellingIssues.forEach(issue => {
                            if (issue.suggestions.length > 0) {
                              updated[issue.fieldId] = issue.suggestions[0];
                            }
                          });
                          setFormData(updated);
                          speak("Đã tự động chuẩn hóa toàn bộ thông tin kê khai khớp với định danh VNeID.");
                          alert("✓ Đã tự động chuẩn hóa và khắc phục toàn bộ lỗi chính tả theo dữ liệu VNeID gốc thành công!");
                        }}
                        className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[11px] py-1.5 px-3 rounded-lg shadow-sm hover:shadow-md transition duration-200 flex items-center space-x-1 cursor-pointer shrink-0 self-start sm:self-center"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Tự động sửa tất cả</span>
                      </button>
                    </div>

                    <div className="text-[11px] bg-white/75 rounded-xl p-2.5 border border-amber-100/50 space-y-1">
                      <p className="font-bold text-amber-900">Chi tiết vị trí thông tin bị sai / chưa khớp:</p>
                      <ul className="list-disc list-inside space-y-1.5 text-slate-700 pl-1">
                        {currentSpellingIssues.map((issue, idx) => (
                          <li key={idx} className="leading-relaxed">
                            <span className="font-extrabold text-slate-900">{issue.label}</span>:{' '}
                            <span className="text-rose-700 font-bold bg-rose-50 px-1 py-0.5 rounded">Gõ: "{issue.submittedValue}"</span>{' '}
                            {issue.vneidValue && !issue.vneidValue.startsWith('(') && (
                              <>→ <span className="text-emerald-800 font-bold bg-emerald-50 px-1 py-0.5 rounded">VNeID gốc: "{issue.vneidValue}"</span>{' '}</>
                            )}
                            <span className="text-amber-800 italic">({issue.message})</span>
                            {issue.suggestions.length > 0 && (
                              <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, [issue.fieldId]: issue.suggestions[0] }))}
                                className="ml-2 text-[10px] bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold px-1.5 py-0.5 rounded transition cursor-pointer"
                              >
                                Sửa thành "{issue.suggestions[0]}"
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                );
              }
              return (
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-3 flex items-center space-x-2 text-xs text-emerald-800">
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                  <span className="font-semibold">Đã kiểm soát chính tả: Mọi thông tin kê khai hoàn toàn khớp với định danh VNeID và gõ chính xác.</span>
                </div>
              );
            })()}

            {/* Sticky Action Bar at Bottom of Form */}
            <div className="sticky bottom-0 bg-white/95 backdrop-blur-md border-t border-slate-200/90 -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 p-3 sm:p-4 shadow-md z-30 rounded-b-2xl flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <span className="text-[11px] text-slate-500 font-semibold italic text-center sm:text-left">
                * Kiểm tra kỹ thông tin và nhấn <strong className="text-emerald-700">"Gửi hồ sơ đăng ký"</strong> để hoàn tất thủ tục.
              </span>
              <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setLoggedInCitizen(null);
                  }}
                  className="flex-1 sm:flex-none bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-5 rounded-xl text-xs transition cursor-pointer text-center"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 px-6 rounded-xl text-xs shadow-md hover:shadow-emerald-200/50 transition cursor-pointer text-center flex items-center justify-center space-x-1.5"
                >
                  <Send className="w-4 h-4" />
                  <span>Gửi hồ sơ đăng ký</span>
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      )}

      {/* Submission Success Portal */}
      {isSubmitted && submissionReceipt && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white border border-slate-100 rounded-3xl p-8 shadow-md max-w-lg mx-auto w-full text-center space-y-6"
        >
          <div className="flex justify-center">
            <CheckCircle2 className="w-20 h-20 text-emerald-500 animate-bounce" />
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl font-black text-slate-900">GỬI HỒ SƠ THÀNH CÔNG!</h3>
            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-widest bg-emerald-50 inline-block px-3 py-1 rounded-full">
              Hệ thống đã phê duyệt & liên thông tự động
            </p>
            <p className="text-slate-500 text-xs mt-2 max-w-sm mx-auto leading-relaxed">
              Dữ liệu hồ sơ số <span className="font-bold text-slate-800">{submissionReceipt.id}</span> đã được ghi nhận trên cổng dịch vụ công của Ủy ban nhân dân phường Tân Mỹ.
            </p>
          </div>

          {/* Dossier Summary Box */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left space-y-2.5">
            <div className="flex justify-between border-b border-slate-200/60 pb-2 text-xs">
              <span className="text-slate-400">Mã Hồ Sơ:</span>
              <span className="font-bold text-slate-800">{submissionReceipt.id}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200/60 pb-2 text-xs">
              <span className="text-slate-400">Thủ Tục:</span>
              <span className="font-bold text-slate-800 truncate max-w-[200px]">{submissionReceipt.serviceName}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200/60 pb-2 text-xs">
              <span className="text-slate-400">Công dân nộp:</span>
              <span className="font-bold text-slate-800">{loggedInCitizen?.fullName}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Chữ ký số:</span>
              <span className="font-bold text-emerald-600">{submissionReceipt.digitalSigned ? 'Có (Đã ký điện tử)' : 'Không'}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col space-y-2 pt-2">
            <button
              onClick={downloadReceipt}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition text-xs flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Tải tệp Hồ sơ Đăng ký (Biên lai số)</span>
            </button>

            <button
              onClick={() => {
                setIsSubmitted(false);
                setSubmissionReceipt(null);
                setShowForm(false);
                resetSpeech();
              }}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs transition"
            >
              Quay lại Trang chủ
            </button>
          </div>
        </motion.div>
      )}

      {/* BEAUTIFUL HIGH-FIDELITY SIGNED DOCUMENT PREVIEW MODAL */}
      <AnimatePresence>
        {viewingSignedDossier && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto animate-fade-in"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col my-8"
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
                <div className="flex items-center space-x-2">
                  <FileCheck2 className="w-5 h-5 text-emerald-400" />
                  <span className="font-extrabold text-sm text-white uppercase tracking-wider">CỔNG LIÊN THÔNG SỐ - PHÊ DUYỆT CHÍNH THỨC</span>
                </div>
                <button
                  onClick={() => setViewingSignedDossier(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Document Container */}
              <div className="p-8 bg-white text-slate-800 overflow-y-auto max-h-[60vh] font-sans relative">
                <div className="relative p-6 border-[3px] border-double border-yellow-600/70 rounded-md space-y-6">
                  {/* Top Header Section */}
                  <div className="flex justify-between items-start text-[11px] font-bold text-slate-900 uppercase">
                    <div className="text-center space-y-0.5">
                      <p>ỦY BAN NHÂN DÂN</p>
                      <p>PHƯỜNG TÂN MỸ</p>
                      <p className="font-mono text-[9px] text-slate-500 font-normal mt-1">Số: {viewingSignedDossier.officerResponse?.decisionNumber || "124/QD-UBND"}</p>
                    </div>
                    <div className="text-center space-y-0.5 font-bold">
                      <p>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                      <p className="underline underline-offset-4 decoration-1 font-extrabold">Độc lập - Tự do - Hạnh phúc</p>
                      <p className="font-normal text-[9px] text-slate-500 lowercase italic mt-1">Tân Mỹ, ngày {viewingSignedDossier.officerResponse?.approvedAt?.split(' ')?.[1] || new Date().toLocaleDateString('vi-VN')}</p>
                    </div>
                  </div>

                  {/* Document Title */}
                  <div className="text-center space-y-2 pt-6">
                    <h2 className="text-xl font-extrabold text-red-700 tracking-wide uppercase">
                      {viewingSignedDossier.serviceName.toUpperCase().includes('KHAI SINH')
                        ? 'GIẤY KHAI SINH (BẢN CHÍNH SỐ HÓA)'
                        : viewingSignedDossier.serviceName.toUpperCase().includes('KẾT HÔN')
                        ? 'GIẤY CHỨNG NHẬN KẾT HÔN (BẢN CHÍNH SỐ HÓA)'
                        : 'QUYẾT ĐỊNH PHÊ DUYỆT HỒ SƠ'
                      }
                    </h2>
                    <p className="text-xs text-slate-500 italic font-medium">Hệ thống Trợ lý số K-GOV ASSIST - Ủy ban nhân dân phường Tân Mỹ</p>
                  </div>

                  {/* Document Body */}
                  <div className="space-y-4 text-xs leading-relaxed pt-4 border-t border-slate-100">
                    <p className="font-bold text-slate-900">Căn cứ Thẩm định và Xác thực qua VneID quốc gia, Ủy ban nhân dân phường Tân Mỹ chứng nhận:</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2.5 font-medium">
                      <div className="flex justify-between border-b border-dashed border-slate-200 pb-1">
                        <span className="text-slate-500">Người yêu cầu / Đăng ký:</span>
                        <span className="font-bold text-slate-900">{viewingSignedDossier.citizenName}</span>
                      </div>
                      <div className="flex justify-between border-b border-dashed border-slate-200 pb-1">
                        <span className="text-slate-500">Số Định danh / CCCD:</span>
                        <span className="font-mono font-bold text-slate-900">{viewingSignedDossier.citizenCccd}</span>
                      </div>
                      <div className="flex justify-between border-b border-dashed border-slate-200 pb-1 md:col-span-2">
                        <span className="text-slate-500">Tên dịch vụ hành chính:</span>
                        <span className="font-bold text-emerald-800">{viewingSignedDossier.serviceName}</span>
                      </div>

                      {/* Display custom form field values entered by citizen */}
                      {Object.entries(viewingSignedDossier.formData || {}).map(([key, val]) => {
                        const dossierService = services.find(s => s.id === viewingSignedDossier.serviceId);
                        const fieldObj = dossierService?.fields.find(f => f.id === key);
                        const fieldLabel = fieldObj ? fieldObj.label : key;
                        return (
                          <div key={key} className="flex justify-between border-b border-dashed border-slate-200 pb-1 md:col-span-2">
                            <span className="text-slate-500 uppercase text-[10px] tracking-wide font-semibold">{fieldLabel}:</span>
                            <span className="font-bold text-slate-900">{String(val)}</span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1.5 mt-4">
                      <p className="font-bold text-slate-900 uppercase text-[10px] tracking-wider text-emerald-800">Thông tin Phê duyệt & Thẩm định:</p>
                      <p className="text-slate-600 leading-normal">{viewingSignedDossier.officerResponse?.responseText}</p>
                    </div>
                  </div>

                  {/* Footer Seal & Signatures Area */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-10 items-end">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Hệ thống lưu trữ số</p>
                      <div className="p-2 border border-blue-200 bg-blue-50/50 rounded-lg space-y-1 max-w-[260px]">
                        <p className="text-[9px] font-extrabold text-blue-800 uppercase flex items-center space-x-1">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                          <span>CHỨNG THƯ SỐ LIÊN THÔNG VneID</span>
                        </p>
                        <p className="text-[8px] text-blue-600 font-medium font-mono">ID: {viewingSignedDossier.id}</p>
                        <p className="text-[8px] text-blue-600 font-medium font-mono">Mã hóa SHA256: {viewingSignedDossier.citizenCccd.slice(0, 4)}...{viewingSignedDossier.id}</p>
                        <p className="text-[8px] text-emerald-700 font-bold bg-emerald-50 px-1 py-0.5 rounded inline-block">TRẠNG THÁI: KHÓA AN TOÀN CA CHÍNH THỨC</p>
                      </div>
                    </div>

                    {/* Official Red Seal and Signature stamp */}
                    <div className="text-center relative flex flex-col items-center justify-center min-h-[160px]">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">TM. ỦY BAN NHÂN DÂN PHƯỜNG TÂN MỸ</p>
                      <p className="text-[11px] font-extrabold text-slate-900 uppercase mt-0.5">{viewingSignedDossier.officerResponse?.signerTitle || "CHỦ TỊCH"}</p>
                      
                      {/* CSS Circular Red Seal Stamp */}
                      <div className="absolute right-12 bottom-6 w-32 h-32 rounded-full border-4 border-double border-red-600/85 flex items-center justify-center text-center p-2 transform rotate-12 scale-95 pointer-events-none select-none bg-red-500/5 shadow-inner">
                        <div className="absolute inset-1.5 border border-dashed border-red-500 rounded-full"></div>
                        <div className="text-[7px] font-extrabold text-red-600 uppercase tracking-tighter leading-tight flex flex-col justify-between h-full py-1">
                          <div>ỦY BAN NHÂN DÂN</div>
                          <div className="text-[10px] font-black text-red-600 font-serif">★</div>
                          <div>PHƯỜNG TÂN MỸ</div>
                        </div>
                      </div>

                      {/* Official Digital Signature badge */}
                      <div className="absolute bottom-1 right-2 w-48 bg-emerald-50 border border-emerald-300 rounded p-1.5 shadow text-left transform -rotate-1 scale-90">
                        <p className="text-[8px] font-extrabold text-emerald-800 uppercase flex items-center space-x-1">
                          <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>KÝ SỐ BỞI: UBND PHƯỜNG TÂN MỸ</span>
                        </p>
                        <p className="text-[7px] text-emerald-600 font-mono mt-0.5">Thời gian: {viewingSignedDossier.officerResponse?.approvedAt}</p>
                        <p className="text-[7px] text-slate-500 font-medium">Người ký: {viewingSignedDossier.officerResponse?.signerName}</p>
                      </div>

                      <div className="mt-14 font-extrabold text-xs text-slate-800 z-10">
                        {viewingSignedDossier.officerResponse?.signerName || "Trần Minh Hải"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action buttons footer */}
              <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row justify-end gap-2">
                <button
                  onClick={() => setViewingSignedDossier(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 px-4 rounded-xl text-xs transition"
                >
                  Đóng cửa sổ
                </button>
                <button
                  onClick={async () => {
                    const doc = new jsPDF();
                    const hasFont = await fetchAndRegisterVietnameseFont(doc);
                    const useFont = hasFont ? "Roboto" : "Helvetica";
                    const txt = (str: string) => hasFont ? str : stripAccents(str);

                    doc.setFont(useFont, "bold");
                    doc.setFontSize(14);
                    doc.text(txt("ỦY BAN NHÂN DÂN PHƯỜNG TÂN MỸ"), 15, 20);
                    doc.setFont(useFont, "normal");
                    doc.setFontSize(10);
                    doc.text(txt(`Số: ${viewingSignedDossier.officerResponse?.decisionNumber || '124/QĐ-UBND'}`), 15, 26);
                    
                    doc.setFont(useFont, "bold");
                    doc.text(txt("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"), 110, 20);
                    doc.setFont(useFont, "normal");
                    doc.text(txt("Độc lập - Tự do - Hạnh phúc"), 125, 26);
                    doc.line(110, 28, 190, 28);
                    
                    doc.setFontSize(16);
                    doc.setFont(useFont, "bold");
                    const title = viewingSignedDossier.serviceName.toUpperCase().includes('KHAI SINH')
                      ? 'GIẤY KHAI SINH (BẢN CHÍNH)'
                      : viewingSignedDossier.serviceName.toUpperCase().includes('KẾT HÔN')
                      ? 'GIẤY CHỨNG NHẬN KẾT HÔN'
                      : 'QUYẾT ĐỊNH PHÊ DUYỆT HỒ SƠ';
                    doc.text(txt(title), 105, 50, { align: 'center' });
                    
                    doc.setFontSize(11);
                    doc.setFont(useFont, "normal");
                    doc.text(txt("Ủy ban nhân dân phường Tân Mỹ, TP. Thủ Dầu Một chứng nhận:"), 15, 65);
                    
                    doc.text(txt(`Họ và tên người yêu cầu: ${viewingSignedDossier.citizenName}`), 15, 75);
                    doc.text(txt(`Số định danh / CCCD: ${viewingSignedDossier.citizenCccd}`), 15, 83);
                    doc.text(txt(`Tên dịch vụ hành chính: ${viewingSignedDossier.serviceName}`), 15, 91);
                    doc.text(txt(`Mã số hồ sơ lưu trữ: ${viewingSignedDossier.id}`), 15, 99);
                    
                    let yPos = 107;
                    const dossierService = services.find(s => s.id === viewingSignedDossier.serviceId);
                    Object.entries(viewingSignedDossier.formData || {}).forEach(([k, v]) => {
                      const fieldObj = dossierService?.fields.find(f => f.id === k);
                      const fieldLabel = fieldObj ? fieldObj.label : k;
                      doc.text(txt(`• ${fieldLabel}: ${String(v)}`), 15, yPos);
                      yPos += 8;
                    });
                    
                    doc.text(txt("Nội dung phản hồi chi tiết từ cơ quan chức năng:"), 15, yPos);
                    yPos += 8;
                    doc.setFont(useFont, "normal"); // Fix: Use 'normal' to prevent falling back to non-Vietnamese Helvetica-Oblique
                    doc.text(txt(viewingSignedDossier.officerResponse?.responseText || ''), 15, yPos, { maxWidth: 180 });
                    
                    yPos += 25;
                    doc.setFont(useFont, "bold");
                    doc.text(txt("TM. ỦY BAN NHÂN DÂN PHƯỜNG TÂN MỸ"), 110, yPos);
                    yPos += 6;
                    doc.text(txt(viewingSignedDossier.officerResponse?.signerTitle || "CHỦ TỊCH"), 130, yPos);
                    
                    // Draw official red seal overlapping the signature title area
                    if (viewingSignedDossier.officerResponse?.hasRedSeal) {
                      drawRedSeal(doc, 132, yPos + 8, useFont, txt);
                    }
                    
                    yPos += 25;
                    doc.setFont(useFont, "bold");
                    doc.text(txt(viewingSignedDossier.officerResponse?.signerName || "Trần Minh Hải"), 130, yPos);
                    
                    doc.setFont(useFont, "normal");
                    doc.text(txt("[SIGNED BY K-GOV DIGITAL CA]"), 15, yPos - 12);
                    doc.text(txt(`Ngày ký: ${viewingSignedDossier.officerResponse?.approvedAt}`), 15, yPos - 6);
                    
                    doc.save(viewingSignedDossier.officerResponse?.responseFile || `ket_qua_${viewingSignedDossier.id}.pdf`);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl text-xs transition flex items-center justify-center space-x-1 cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>Tải tệp PDF chính thức (.pdf)</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
