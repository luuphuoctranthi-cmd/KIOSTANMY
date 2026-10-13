import { CitizenProfile, PublicService, DigitalSignature, AccessAuditLog } from './types';

export const DEFAULT_AUDIT_LOGS: AccessAuditLog[] = [
  {
    id: "LOG-20260807-001",
    timestamp: "2026-08-07 09:15:22",
    actorCccdOrId: "OFFICER-001",
    actorName: "Đại úy Nguyễn Văn Hùng",
    actorRole: "OFFICER",
    action: "TRA_CUU_CSDL",
    targetCccd: "990000000001",
    targetName: "Trần Văn Nam",
    ipAddress: "10.220.14.88 (Mạng Chuyên Dùng K-Gov)",
    details: "Xác minh thông tin cư trú phục vụ thủ tục Đăng ký kết hôn trực tuyến",
    securityLevel: "SENSITIVE"
  },
  {
    id: "LOG-20260807-002",
    timestamp: "2026-08-07 09:20:10",
    actorCccdOrId: "990000000001",
    actorName: "Trần Văn Nam",
    actorRole: "CITIZEN",
    action: "NOP_HO_SO",
    targetCccd: "990000000001",
    targetName: "Trần Văn Nam",
    ipAddress: "113.161.42.105 (VNeID Mobile App)",
    details: "Nộp hồ sơ Đăng ký kết hôn (Mã: HOS-20260807-8812) - Xác thực sinh trắc học FaceID & chữ ký số thành công",
    securityLevel: "NORMAL"
  },
  {
    id: "LOG-20260807-003",
    timestamp: "2026-08-07 09:35:45",
    actorCccdOrId: "OFFICER-002",
    actorName: "Thiếu tá Trần Quốc Bảo",
    actorRole: "OFFICER",
    action: "PHE_DUYET_HO_SO",
    targetCccd: "990000000001",
    targetName: "Trần Văn Nam & Trần Thị Mai Phương",
    ipAddress: "10.220.14.92 (Cổng Tiếp nhận UBND Phường)",
    details: "Phê duyệt Trích lục Kết hôn điện tử (Số 14/2026/TLKH) - Ký số cơ quan & gắn con dấu đỏ điện tử",
    securityLevel: "SENSITIVE"
  },
  {
    id: "LOG-20260807-004",
    timestamp: "2026-08-07 09:42:01",
    actorCccdOrId: "SYSTEM-VNEID",
    actorName: "Hệ thống CSDL Quốc gia về Dân cư",
    actorRole: "SYSTEM",
    action: "DONG_BO_VNEID",
    targetCccd: "990000000001",
    targetName: "Trần Văn Nam",
    ipAddress: "10.0.1.1 (Trục Liên thông DVC Quốc gia)",
    details: "Đồng bộ tự động thông tin biến động tình trạng hôn nhân từ 'Độc thân' sang 'Đã kết hôn' trên CSDL VNeID",
    securityLevel: "SENSITIVE"
  }
];

export const DEFAULT_CITIZENS: CitizenProfile[] = [
  {
    cccd: "990000000001",
    fullName: "Trần Văn Nam",
    dob: "2001-07-06",
    gender: "Nam",
    address: "43 Đường Lê Lợi, Phường Tân Mỹ, TP. Thủ Dầu Một, Bình Dương",
    phoneNumber: "0912417331",
    maritalStatus: "Độc thân",
    nationality: "Việt Nam",
    fatherName: "Trần Văn Hùng",
    motherName: "Nguyễn Thị Hoa"
  },
  {
    cccd: "990000000002",
    fullName: "Lê Văn Dũng",
    dob: "2002-05-25",
    gender: "Nam",
    address: "251 Đường Nguyễn Trãi, Phường Tân Mỹ, TP. Thủ Dầu Một, Bình Dương",
    phoneNumber: "0910201108",
    maritalStatus: "Độc thân",
    nationality: "Việt Nam",
    fatherName: "Lê Văn Hùng",
    motherName: "Nguyễn Thị Ngọc"
  },
  {
    cccd: "990000000003",
    fullName: "Trần Thị Mai Phương",
    dob: "2005-09-30",
    gender: "Nữ",
    address: "53 Đường CMT8, Phường Tân Mỹ, TP. Thủ Dầu Một, Bình Dương",
    phoneNumber: "0963026217",
    maritalStatus: "Độc thân",
    nationality: "Việt Nam",
    fatherName: "Trần Văn Phú",
    motherName: "Lê Thị Mai"
  },
  {
    cccd: "990000000004",
    fullName: "Hoàng Ngọc Long",
    dob: "1993-03-31",
    gender: "Nam",
    address: "11 Đường Phú Lợi, Phường Tân Mỹ, TP. Thủ Dầu Một, Bình Dương",
    phoneNumber: "0933156412",
    maritalStatus: "Độc thân",
    nationality: "Việt Nam",
    fatherName: "Hoàng Văn Tuấn",
    motherName: "Phạm Thị Loan"
  },
  {
    cccd: "990000000005",
    fullName: "Nguyễn Thị Bình",
    dob: "1998-10-27",
    gender: "Nữ",
    address: "209 Đường Yersin, Phường Tân Mỹ, TP. Thủ Dầu Một, Bình Dương",
    phoneNumber: "0948790047",
    maritalStatus: "Độc thân",
    nationality: "Việt Nam",
    fatherName: "Nguyễn Văn Đức",
    motherName: "Trần Thị Huệ"
  },
  {
    cccd: "990000000006",
    fullName: "Hoàng Thanh An",
    dob: "1995-08-06",
    gender: "Nam",
    address: "98 Đường Huỳnh Văn Lũy, Phường Tân Mỹ, TP. Thủ Dầu Một, Bình Dương",
    phoneNumber: "0982566828",
    maritalStatus: "Độc thân",
    nationality: "Việt Nam",
    fatherName: "Hoàng Văn Phúc",
    motherName: "Đỗ Thị Hằng"
  },
  {
    cccd: "990000000007",
    fullName: "Hoàng Văn Hải",
    dob: "1996-08-20",
    gender: "Nam",
    address: "173 Đường Phạm Ngũ Lão, Phường Tân Mỹ, TP. Thủ Dầu Một, Bình Dương",
    phoneNumber: "0928319332",
    maritalStatus: "Độc thân",
    nationality: "Việt Nam",
    fatherName: "Hoàng Văn Hải",
    motherName: "Nguyễn Thị Oanh"
  },
  {
    cccd: "990000000008",
    fullName: "Phạm Thanh Giang",
    dob: "1989-04-23",
    gender: "Nam",
    address: "56 Đường 30 Tháng 4, Phường Tân Mỹ, TP. Thủ Dầu Một, Bình Dương",
    phoneNumber: "0981644415",
    maritalStatus: "Độc thân",
    nationality: "Việt Nam",
    fatherName: "Phạm Văn Thành",
    motherName: "Vũ Thị Hương"
  },
  {
    cccd: "990000000009",
    fullName: "Lê Thị Thanh Nam",
    dob: "1993-01-07",
    gender: "Nữ",
    address: "189 Đường Đại Lộ Bình Dương, Phường Tân Mỹ, TP. Thủ Dầu Một, Bình Dương",
    phoneNumber: "0967591036",
    maritalStatus: "Độc thân",
    nationality: "Việt Nam",
    fatherName: "Lê Văn Tùng",
    motherName: "Nguyễn Thị Lỡ"
  },
  {
    cccd: "990000000010",
    fullName: "Trần Gia Dũng",
    dob: "1996-09-11",
    gender: "Nam",
    address: "109 Đường Phan Đăng Lưu, Phường Tân Mỹ, TP. Thủ Dầu Một, Bình Dương",
    phoneNumber: "0984793294",
    maritalStatus: "Độc thân",
    nationality: "Việt Nam",
    fatherName: "Trần Gia Bảo",
    motherName: "Nguyễn Thị Hoa"
  },
  {
    cccd: "990000000011",
    fullName: "Trần Thị Ngọc Nam",
    dob: "1997-08-04",
    gender: "Nữ",
    address: "78 Đường Trần Văn Ơn, Phường Tân Mỹ, TP. Thủ Dầu Một, Bình Dương",
    phoneNumber: "0951772393",
    maritalStatus: "Độc thân",
    nationality: "Việt Nam",
    fatherName: "Trần Văn Sơn",
    motherName: "Đặng Thị Thảo"
  },
  {
    cccd: "990000000012",
    fullName: "Lê Ngọc Quân",
    dob: "1977-08-12",
    gender: "Nam",
    address: "86 Đường Lê Hồng Phong, Phường Tân Mỹ, TP. Thủ Dầu Một, Bình Dương",
    phoneNumber: "0929327351",
    maritalStatus: "Đã kết hôn",
    nationality: "Việt Nam",
    fatherName: "Lê Văn Tiến",
    motherName: "Phạm Thị Cúc"
  },
  {
    cccd: "990000000013",
    fullName: "Lê Thị Gia Long",
    dob: "1998-06-15",
    gender: "Nữ",
    address: "219 Đường Nguyễn Thị Minh Khai, Phường Tân Mỹ, TP. Thủ Dầu Một, Bình Dương",
    phoneNumber: "0966391880",
    maritalStatus: "Độc thân",
    nationality: "Việt Nam",
    fatherName: "Nguyễn Văn Hùng",
    motherName: "Lê Thị Mai"
  },
  {
    cccd: "990000000014",
    fullName: "Trần Thị Trúc Quân",
    dob: "2000-05-13",
    gender: "Nữ",
    address: "214 Đường Bác Bác, Phường Tân Mỹ, TP. Thủ Dầu Một, Bình Dương",
    phoneNumber: "0971113159",
    maritalStatus: "Độc thân",
    nationality: "Việt Nam",
    fatherName: "Trần Văn Khang",
    motherName: "Trịnh Thị Quyên"
  },
  {
    cccd: "990000000015",
    fullName: "Trần Văn Chi",
    dob: "2004-02-19",
    gender: "Nam",
    address: "246 Đường Võ Văn Kiệt, Phường Tân Mỹ, TP. Thủ Dầu Một, Bình Dương",
    phoneNumber: "0982617299",
    maritalStatus: "Độc thân",
    nationality: "Việt Nam",
    fatherName: "Trần Văn Trường",
    motherName: "Lý Thị Diệu"
  },
  {
    cccd: "990000000016",
    fullName: "Lê Văn Bình",
    dob: "1976-02-19",
    gender: "Nam",
    address: "263 Đường ĐT743, Phường Tân Mỹ, TP. Thủ Dầu Một, Bình Dương",
    phoneNumber: "0980869981",
    maritalStatus: "Đã kết hôn",
    nationality: "Việt Nam",
    fatherName: "Lê Văn Quý",
    motherName: "Phùng Thị Nhài"
  },
  {
    cccd: "012345678901",
    fullName: "Nguyễn Văn An",
    dob: "1990-05-15",
    gender: "Nam",
    address: "Số 12, Đường Trần Phú, Khu phố 3, Phường Tân Mỹ, TP. Thủ Dầu Một, Bình Dương",
    phoneNumber: "0912345678",
    maritalStatus: "Độc thân",
    nationality: "Việt Nam",
    fatherName: "Nguyễn Văn Bình",
    motherName: "Lê Thị Lan"
  },
  {
    cccd: "098765432109",
    fullName: "Trần Thị Mai Phương",
    dob: "1995-10-20",
    gender: "Nữ",
    address: "Số 45/2, Đường Lê Lợi, Khu phố 1, Phường Tân Mỹ, TP. Thủ Dầu Một, Bình Dương",
    phoneNumber: "0988776655",
    maritalStatus: "Độc thân",
    nationality: "Việt Nam",
    fatherName: "Trần Văn Phú",
    motherName: "Nguyễn Thị Ngọc"
  }
];

export const DEFAULT_SIGNATURES: DigitalSignature[] = [
  {
    id: "SIG-001",
    ownerCccd: "012345678901",
    ownerName: "Nguyễn Văn An",
    role: "CITIZEN",
    keyName: "Chữ ký số cá nhân - Nguyễn Văn An (CA-Viettel)"
  },
  {
    id: "SIG-002",
    ownerCccd: "098765432109",
    ownerName: "Trần Thị Mai Phương",
    role: "CITIZEN",
    keyName: "Chữ ký số cá nhân - Trần Thị Mai Phương (CA-FPT)"
  },
  {
    id: "SIG-OFFICER",
    ownerCccd: "999999999999",
    ownerName: "Cán bộ Tư pháp Trần Minh Hải",
    role: "OFFICER",
    keyName: "Chữ ký số công vụ - Trần Minh Hải (Ủy ban nhân dân phường Tân Mỹ - CA-BanCơYếu)"
  }
];

export const DEFAULT_SERVICES: PublicService[] = [
  {
    id: "SRV-BIRTH",
    name: "Đăng ký khai sinh trực tuyến",
    keywords: ["khai sinh", "đăng ký khai sinh", "làm giấy khai sinh", "sinh con"],
    description: "Đăng ký khai sinh cho trẻ em sinh ra trong nước, hỗ trợ liên thông dữ liệu hộ tịch.",
    aiGuidelines: `QUY ĐỊNH THẨM ĐỊNH ĐĂNG KÝ KHAI SINH TRỰC TUYẾN:
1. Thông tin người đi đăng ký (cha/mẹ) phải khớp 100% với Cơ sở dữ liệu dân cư quốc gia về Họ tên, Ngày sinh, CCCD, Địa chỉ.
2. Trẻ em khai sinh phải có đầy đủ Họ tên, Giới tính, Ngày sinh, Nơi sinh cụ thể (Bệnh viện/Cơ sở y tế).
3. Đòi hỏi nộp kèm: Giấy chứng sinh của cơ sở y tế (định dạng ảnh/pdf). Nếu không có giấy chứng sinh, phải có văn bản xác nhận của người làm chứng hoặc giấy cam đoan.
4. Trường hợp cha mẹ đã kết hôn: thông tin chồng/vợ phải trùng khớp với dữ liệu dân cư hoặc giấy chứng nhận kết hôn.`,
    formTemplateName: "bieu_mau_khai_sinh.pdf",
    feedbackTemplateName: "giay_khai_sinh_ban_chinh.pdf",
    requiredProofs: [
      { id: "proof_birth_doc", docName: "Giấy chứng sinh (Bản chính y tế) hoặc Giấy cam đoan", isRequired: true, description: "Tệp ảnh/PDF chụp rõ nét Giấy chứng sinh do cơ sở y tế cấp", fieldId: "proof_birth" },
      { id: "proof_parents_cccd", docName: "Ảnh chụp/Scan CCCD 2 mặt của Cha và Mẹ", isRequired: true, description: "Giấy tờ định danh cá nhân của cha mẹ người làm khai sinh" },
      { id: "proof_marriage_cert", docName: "Giấy chứng nhận kết hôn của Cha Mẹ", isRequired: false, description: "Xác minh mối quan hệ hôn nhân hợp pháp của cha mẹ" }
    ],
    fields: [
      { id: "parent_name", label: "Họ và tên người yêu cầu (Cha/Mẹ)", type: "text", vneidField: "fullName", required: true },
      { id: "parent_cccd", label: "Số định danh/CCCD người yêu cầu", type: "text", vneidField: "cccd", required: true },
      { id: "child_name", label: "Họ, chữ đệm và tên khai sinh của trẻ", type: "text", placeholder: "Ví dụ: Nguyễn Văn Hải", required: true },
      { id: "child_gender", label: "Giới tính của trẻ", type: "select", options: ["Nam", "Nữ"], required: true },
      { id: "child_dob", label: "Ngày, tháng, năm sinh của trẻ", type: "date", required: true },
      { id: "child_pob", label: "Nơi sinh của trẻ", type: "text", placeholder: "Ví dụ: Bệnh viện Phụ sản Bình Dương", required: true },
      { id: "proof_birth", label: "Giấy chứng sinh hoặc văn bản làm chứng (Tải lên file minh chứng)", type: "file", required: true }
    ]
  },
  {
    id: "SRV-MARRIAGE",
    name: "Đăng ký kết hôn trực tuyến",
    keywords: ["kết hôn", "đăng ký kết hôn", "lấy vợ", "lấy chồng", "gia đình"],
    description: "Đăng ký kết hôn cho công dân Việt Nam cư trú tại địa bàn phường.",
    aiGuidelines: `QUY ĐỊNH THẨM ĐỊNH ĐĂNG KÝ KẾT HÔN TRỰC TUYẾN:
1. Cả hai bên nam và nữ phải đủ tuổi kết hôn theo Luật Hôn nhân gia đình (Nam từ đủ 20 tuổi, Nữ từ đủ 18 tuổi).
2. Tình trạng hôn nhân của cả hai bên tại thời điểm đăng ký phải là "Độc thân".
3. Địa chỉ thường trú hoặc tạm trú của ít nhất một trong hai bên phải thuộc Phường Tân Mỹ.
4. Đòi hỏi tải lên: Giấy xác nhận tình trạng hôn nhân (nếu cư trú nơi khác) hoặc cam đoan độc thân, cùng hình ảnh mặt trước/mặt sau CCCD của cả hai bên.`,
    formTemplateName: "bieu_mau_ket_hon.pdf",
    feedbackTemplateName: "giay_chung_nhan_ket_hon.pdf",
    requiredProofs: [
      { id: "proof_single_cert", docName: "Giấy xác nhận tình trạng hôn nhân (XN độc thân)", isRequired: true, description: "Do UBND cấp xã nơi thường trú trước đây cấp", fieldId: "proof_marital_status" },
      { id: "proof_couple_cccd", docName: "Ảnh chụp/Scan CCCD 2 mặt của Nam và Nữ", isRequired: true, description: "Giấy tờ định danh xác minh độ tuổi kết hôn theo pháp luật" }
    ],
    fields: [
      { id: "husband_name", label: "Họ và tên chồng", type: "text", vneidField: "fullName", placeholder: "Nhập họ và tên chồng", required: true },
      { id: "husband_cccd", label: "Số CCCD chồng", type: "text", vneidField: "cccd", placeholder: "Nhập số CCCD chồng", required: true },
      { id: "husband_dob", label: "Ngày sinh của chồng", type: "date", vneidField: "dob", required: true },
      { id: "wife_name", label: "Họ và tên vợ", type: "text", vneidField: "fullName", placeholder: "Nhập họ tên vợ", required: true },
      { id: "wife_cccd", label: "Số CCCD vợ", type: "text", vneidField: "cccd", placeholder: "Nhập số CCCD vợ", required: true },
      { id: "wife_dob", label: "Ngày sinh của vợ", type: "date", vneidField: "dob", required: true },
      { id: "proof_marital_status", label: "Tờ khai/Giấy xác nhận tình trạng độc thân (Tải lên file minh chứng)", type: "file", required: true }
    ]
  },
  {
    id: "SRV-RESIDENCE",
    name: "Đăng ký thường trú",
    keywords: ["thường trú", "hộ khẩu", "nhập khẩu", "chuyển hộ khẩu", "đăng ký thường trú"],
    description: "Đăng ký thường trú cho công dân có chỗ ở hợp pháp tại phường.",
    aiGuidelines: `QUY ĐỊNH THẨM ĐỊNH ĐĂNG KÝ THƯỜNG TRÚ:
1. Người đăng ký phải cung cấp đầy đủ thông tin giấy tờ chứng minh chỗ ở hợp pháp (Sổ đỏ, Hợp đồng mua bán nhà, hoặc văn bản đồng ý cho nhập hộ khẩu của chủ hộ).
2. Thông tin chủ hộ và mối quan hệ với chủ hộ phải rõ ràng.
3. Địa chỉ đăng ký thường trú mới phải nằm đúng trong địa bàn Phường Tân Mỹ.
4. Các trường thông tin cá nhân của người yêu cầu phải khớp 100% với dữ liệu VneID.`,
    formTemplateName: "bieu_mau_thuong_tru.pdf",
    feedbackTemplateName: "thong_bao_ket_qua_cu_tru.pdf",
    requiredProofs: [
      { id: "proof_house_doc", docName: "Giấy tờ chứng minh chỗ ở hợp pháp (Sổ đỏ / Hợp đồng nhà ở)", isRequired: true, description: "Sổ đỏ/Sổ hồng hoặc Hợp đồng mua bán nhà/Hợp đồng thuê nhà", fieldId: "proof_house" },
      { id: "proof_ct01_form", docName: "Tờ khai thay đổi thông tin cư trú (Mẫu CT01 / Văn bản đồng ý chủ hộ)", isRequired: true, description: "Tờ khai cư trú có chữ ký đồng ý của chủ hộ" }
    ],
    fields: [
      { id: "applicant_name", label: "Họ và tên người đăng ký", type: "text", vneidField: "fullName", required: true },
      { id: "applicant_cccd", label: "Số định danh/CCCD", type: "text", vneidField: "cccd", required: true },
      { id: "new_address", label: "Địa chỉ thường trú mới yêu cầu", type: "text", placeholder: "Ví dụ: Số 123 Đường Trần Phú, Phường Tân Mỹ", required: true },
      { id: "owner_relation", label: "Quan hệ với chủ hộ", type: "select", options: ["Chủ hộ", "Vợ/Chồng", "Con", "Bố/Mẹ", "Cháu", "Khác"], required: true },
      { id: "proof_house", label: "Giấy tờ chứng minh chỗ ở hợp pháp (Sổ đỏ/Hợp đồng mua nhà/Ủy quyền)", type: "file", required: true }
    ]
  },
  {
    id: "SRV-LAND",
    name: "Đăng ký / Xác nhận thông tin Đất đai & Nhà ở",
    keywords: ["đất đai", "sổ đỏ", "nhà ở", "bất động sản", "xác nhận đất đai", "quyền sử dụng đất"],
    description: "Tiếp nhận và giải quyết các thủ tục đăng ký, xác nhận quy hoạch, trích đo thông tin đất đai và nhà ở cho công dân.",
    aiGuidelines: `QUY ĐỊNH THẨM ĐỊNH THỦ TỤC ĐẤT ĐAI VÀ NHÀ Ở:
1. Họ tên người nộp và số CCCD phải khớp 100% với dữ liệu CSDL Dân cư Quốc gia VNeID.
2. Vị trí thửa đất, số tờ bản đồ và số thửa phải thuộc địa giới hành chính Phường Tân Mỹ.
3. Bắt buộc đính kèm tệp minh chứng: Giấy chứng nhận quyền sử dụng đất (Sổ đỏ/Sổ hồng) hoặc Hợp đồng chuyển nhượng/tặng cho có công chứng.
4. Trường hợp đồng sở hữu: Phải có văn bản ủy quyền hoặc đồng ý của các chủ sở hữu hợp pháp khác.`,
    formTemplateName: "bieu_mau_dang_ky_dat_dai.pdf",
    feedbackTemplateName: "trich_xac_nhan_thong_tin_dat_dai.pdf",
    requiredProofs: [
      { id: "proof_land_cert", docName: "Giấy chứng nhận QSDĐ (Sổ đỏ / Sổ hồng bản gốc)", isRequired: true, description: "Ảnh chụp / Scan mặt trước & mặt trong Sổ đỏ", fieldId: "proof_land_doc" },
      { id: "proof_land_contract", docName: "Hợp đồng chuyển nhượng / Tặng cho / Thừa kế (Có công chứng)", isRequired: true, description: "Văn bản xác nhận quyền sở hữu nhà ở/đất đai" },
      { id: "proof_land_map", docName: "Sơ đồ trích đo hiện trạng thửa đất", isRequired: false, description: "Bản vẽ hiện trạng trích đo phục vụ thẩm định" }
    ],
    fields: [
      { id: "landowner_name", label: "Họ và tên người sử dụng đất / Người nộp", type: "text", vneidField: "fullName", required: true },
      { id: "landowner_cccd", label: "Số định danh / CCCD", type: "text", vneidField: "cccd", required: true },
      { id: "land_address", label: "Địa chỉ thửa đất / Bất động sản", type: "text", placeholder: "Ví dụ: Thửa đất số 45, Tờ bản đồ số 12, Phường Tân Mỹ", required: true },
      { id: "land_area", label: "Diện tích thửa đất đề nghị (m²)", type: "text", placeholder: "Ví dụ: 120.5 m²", required: true },
      { id: "land_purpose", label: "Mục đích sử dụng đất", type: "select", options: ["Đất ở tại đô thị (ODT)", "Đất trồng cây lâu năm (CLN)", "Đất thương mại dịch vụ (TMD)", "Đất cơ sở sản xuất phi nông nghiệp (SKC)"], required: true },
      { id: "proof_land_doc", label: "Tệp minh chứng Giấy chứng nhận QSDĐ / Hợp đồng đính kèm", type: "file", required: true }
    ]
  }
];

export const VOICE_EXAMPLES = [
  { text: "Tôi muốn đăng ký làm giấy khai sinh trực tuyến cho con trai tôi", matchedId: "SRV-BIRTH" },
  { text: "Tôi muốn làm thủ tục đăng ký kết hôn với Trần Thị Mai Phương", matchedId: "SRV-MARRIAGE" },
  { text: "Tôi cần làm hồ sơ đăng ký thường trú tại phường Tân Mỹ", matchedId: "SRV-RESIDENCE" },
  { text: "Tôi muốn làm thủ tục xác nhận đăng ký đất đai nhà ở tại phường Tân Mỹ", matchedId: "SRV-LAND" },
  { text: "Sinh con xong thì làm giấy tờ gì để đăng ký hộ khẩu thường trú thế ạ?", matchedId: "SRV-RESIDENCE" }
];

let cachedRegularFontBase64: string | null = null;
let cachedBoldFontBase64: string | null = null;

export async function fetchAndRegisterVietnameseFont(doc: any): Promise<boolean> {
  try {
    if (!cachedRegularFontBase64) {
      const response = await fetch('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf');
      if (!response.ok) throw new Error('Failed to fetch regular font');
      const blob = await response.blob();
      cachedRegularFontBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.readAsDataURL(blob);
      });
    }

    if (!cachedBoldFontBase64) {
      try {
        const response = await fetch('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Medium.ttf');
        if (response.ok) {
          const blob = await response.blob();
          cachedBoldFontBase64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64 = (reader.result as string).split(',')[1];
              resolve(base64);
            };
            reader.readAsDataURL(blob);
          });
        } else {
          cachedBoldFontBase64 = cachedRegularFontBase64;
        }
      } catch (err) {
        cachedBoldFontBase64 = cachedRegularFontBase64;
      }
    }

    if (cachedRegularFontBase64) {
      doc.addFileToVFS('Roboto-Regular.ttf', cachedRegularFontBase64);
      doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    }
    if (cachedBoldFontBase64) {
      doc.addFileToVFS('Roboto-Bold.ttf', cachedBoldFontBase64);
      doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
    }
    return true;
  } catch (error) {
    console.error('Lỗi khi tải phông chữ tiếng Việt cho PDF:', error);
    return false;
  }
}

// Draw a professional circular red government seal (Mộc đỏ)
export function drawRedSeal(doc: any, x: number, y: number, useFont: string, txt: (str: string) => string): void {
  try {
    // Save current graphics state (colors, lines, etc.)
    doc.saveGraphicsState();
    
    // Set line and text color to red (hex #dc2626 or RGB 220, 38, 38)
    doc.setDrawColor(220, 38, 38);
    doc.setFillColor(220, 38, 38);
    doc.setTextColor(220, 38, 38);
    
    // 1. Draw outer circle (radius 22)
    doc.setLineWidth(1.2);
    doc.circle(x, y, 22, 'S');
    
    // 2. Draw inner circle (radius 18)
    doc.setLineWidth(0.4);
    doc.circle(x, y, 18.5, 'S');
    
    // 3. Draw curved/arranged texts inside
    doc.setFont(useFont, "bold");
    
    // Curved style simulation via text positions
    doc.setFontSize(6.5);
    doc.text(txt("ỦY BAN NHÂN DÂN"), x, y - 11, { align: "center" });
    doc.text(txt("PHƯỜNG TÂN MỸ"), x, y - 7, { align: "center" });
    
    // Center national emblem symbol or big star
    doc.setFontSize(14);
    doc.text("★", x, y + 1.5, { align: "center" });
    
    // Bottom texts inside seal
    doc.setFontSize(6.5);
    doc.text(txt("ĐÃ PHÊ DUYỆT"), x, y + 9, { align: "center" });
    doc.setFontSize(5.5);
    doc.text(txt("CỔNG K-GOV CA"), x, y + 13, { align: "center" });
    
    // Restore graphics state to not impact other parts of the document
    doc.restoreGraphicsState();
  } catch (err) {
    console.error("Error drawing red seal:", err);
  }
}
