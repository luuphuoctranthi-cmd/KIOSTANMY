import React, { useState, useEffect } from 'react';
import { DEFAULT_SERVICES, DEFAULT_CITIZENS, DEFAULT_SIGNATURES, DEFAULT_AUDIT_LOGS, DEFAULT_DOSSIERS, DEFAULT_NOTIFICATIONS } from './data';
import { PublicService, CitizenProfile, DigitalSignature, Dossier, VneIDNotification, AccessAuditLog } from './types';
import CitizenPortal from './components/CitizenPortal';
import OfficerPortal from './components/OfficerPortal';
import TanMyLogo from './components/TanMyLogo';
import { Shield, Home, Users, Building2, Star, CheckCircle, Clock, FileCheck2, Landmark, Sparkles } from 'lucide-react';

function safeJsonParse<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return fallback;
    const parsed = JSON.parse(saved);
    if (Array.isArray(fallback) && (!Array.isArray(parsed) || parsed.length === 0)) {
      return fallback;
    }
    return parsed;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [services, setServices] = useState<PublicService[]>(() => 
    safeJsonParse('kgov_services', DEFAULT_SERVICES)
  );
  const [citizens, setCitizens] = useState<CitizenProfile[]>(() => 
    safeJsonParse('kgov_citizens', DEFAULT_CITIZENS)
  );
  const [signatures, setSignatures] = useState<DigitalSignature[]>(() => 
    safeJsonParse('kgov_signatures', DEFAULT_SIGNATURES)
  );
  const [dossiers, setDossiers] = useState<Dossier[]>(() => {
    const savedDossiers = safeJsonParse<Dossier[]>('kgov_dossiers', DEFAULT_DOSSIERS);
    // Ensure default demo dossier HOS-20260807-8812 is always present if missing
    if (!savedDossiers.some(d => d.id === 'HOS-20260807-8812')) {
      return [...DEFAULT_DOSSIERS, ...savedDossiers];
    }
    return savedDossiers;
  });
  const [notifications, setNotifications] = useState<VneIDNotification[]>(() => {
    const savedNotifs = safeJsonParse<VneIDNotification[]>('kgov_notifications', DEFAULT_NOTIFICATIONS);
    // Ensure default demo notifications for Tran Van Nam are present
    const missingDefaults = DEFAULT_NOTIFICATIONS.filter(dn => !savedNotifs.some(sn => sn.id === dn.id));
    return missingDefaults.length > 0 ? [...missingDefaults, ...savedNotifs] : savedNotifs;
  });
  const [auditLogs, setAuditLogs] = useState<AccessAuditLog[]>(() =>
    safeJsonParse('kgov_audit_logs', DEFAULT_AUDIT_LOGS)
  );
  const [activePortal, setActivePortal] = useState<'CITIZEN' | 'OFFICER'>('CITIZEN');

  // Save states to localStorage
  useEffect(() => {
    localStorage.setItem('kgov_services', JSON.stringify(services));
  }, [services]);

  useEffect(() => {
    localStorage.setItem('kgov_citizens', JSON.stringify(citizens));
  }, [citizens]);

  useEffect(() => {
    localStorage.setItem('kgov_signatures', JSON.stringify(signatures));
  }, [signatures]);

  useEffect(() => {
    localStorage.setItem('kgov_dossiers', JSON.stringify(dossiers));
  }, [dossiers]);

  useEffect(() => {
    localStorage.setItem('kgov_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('kgov_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  // Callback to add a new dossier
  const handleAddDossier = (newDossier: Dossier) => {
    setDossiers((prev) => [newDossier, ...prev]);
  };

  // Callback to add a new VNeID notification
  const handleAddNotification = (newNotif: VneIDNotification) => {
    setNotifications((prev) => [newNotif, ...prev]);
  };

  // Callback to log an audit entry
  const handleAddAuditLog = (newLog: Omit<AccessAuditLog, 'id' | 'timestamp'>) => {
    const fullLog: AccessAuditLog = {
      ...newLog,
      id: `LOG-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toLocaleString('sv-SE').replace('T', ' ')
    };
    setAuditLogs((prev) => [fullLog, ...prev]);
  };

  const marqueeText = "Hạ tầng số phục vụ công tác tái cấu trúc quy trình tiếp nhận dịch vụ công trực tuyến toàn trình — Hệ thống Trợ lý AI K-Gov Assist liên thông Cơ sở dữ liệu Quốc gia về Dân cư VNeID — Tự động hóa thẩm định hồ sơ, nhận diện khẩu lệnh thông minh và khảo sát hài lòng công dân. ";

  return (
    <div className="min-h-screen w-full bg-slate-100 flex flex-col justify-between font-sans selection:bg-blue-500/20 selection:text-blue-900 text-slate-800" id="app-root">
      {/* HEADER SECTION WITH CENTERED TITLE & OFFICIAL WARD LOGO */}
      <header className="bg-white border-b border-slate-200/90 shadow-xs shrink-0" id="app-header">
        {/* CENTERED MAIN BRAND TITLE AREA */}
        <div className="w-full px-3 sm:px-6 pt-2.5 pb-2 text-center" id="brand-area">
          <div className="flex flex-col items-center justify-center space-y-1.5" id="brand-title-group">
            {/* Title Row with Official Ward Logo on the SAME horizontal line */}
            <div className="flex flex-row items-center justify-center gap-2 sm:gap-4 md:gap-5" id="header-logo-title-row">
              {/* Official Tan My Ward Logo Component */}
              <TanMyLogo className="h-10 sm:h-14 md:h-18 w-auto shrink-0 filter drop-shadow-sm" />

              {/* Uniform Title in Official Logo Blue */}
              <h1 className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-black text-[#0072CE] tracking-tight uppercase font-sans text-center drop-shadow-xs" id="main-portal-title">
                CỔNG DỊCH VỤ CÔNG PHƯỜNG TÂN MỸ
              </h1>
            </div>

            {/* Continuous Marquee Text in Dark Blue without Red Background */}
            <div className="w-full max-w-6xl bg-slate-100/80 text-[#002B66] rounded-md py-0.5 px-2.5 overflow-hidden border border-slate-200 select-none my-0.5" id="portal-sub-caption">
              <div className="animate-marquee whitespace-nowrap flex items-center text-[10px] sm:text-xs font-extrabold tracking-wide uppercase text-[#002B66]">
                <span className="pr-6">{marqueeText}</span>
                <span className="pr-6">{marqueeText}</span>
              </div>
            </div>

            {/* Quick System Badge Pills */}
            <div className="hidden sm:flex flex-wrap items-center justify-center gap-1.5 pt-0.5">
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 bg-blue-50 text-blue-900 rounded-full text-[10px] font-bold border border-blue-200">
                <Shield className="w-3 h-3 text-[#0072CE]" />
                <span>Hạ tầng Số Quốc gia</span>
              </span>
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 bg-sky-50 text-sky-900 rounded-full text-[10px] font-bold border border-sky-200">
                <Sparkles className="w-3 h-3 text-[#008BE3]" />
                <span>Trợ lý Thẩm định AI</span>
              </span>
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 bg-indigo-50 text-indigo-900 rounded-full text-[10px] font-bold border border-indigo-200">
                <CheckCircle className="w-3 h-3 text-indigo-600" />
                <span>Dịch vụ công Toàn trình</span>
              </span>
            </div>
          </div>
        </div>

        {/* CENTERED TAB NAVIGATION MENU */}
        <div className="border-t border-slate-200 bg-slate-50/90 shadow-xs" id="portal-tabs-nav">
          <div className="w-full px-2 sm:px-6">
            <div className="flex flex-col sm:flex-row justify-center items-center gap-1.5 sm:space-x-2 py-1.5" id="tabs-container">
              <button
                id="tab-citizen"
                onClick={() => setActivePortal('CITIZEN')}
                className={`w-full sm:w-auto flex items-center justify-center space-x-1.5 px-4 py-2 sm:py-1.5 rounded-lg text-xs font-extrabold transition-all duration-200 cursor-pointer shadow-xs ${
                  activePortal === 'CITIZEN'
                    ? 'bg-[#0072CE] text-white shadow-md shadow-blue-600/20 border border-blue-700 ring-2 ring-blue-500/30'
                    : 'bg-white text-slate-700 hover:text-blue-900 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Home className="w-3.5 h-3.5" />
                <span>Cổng Dịch Vụ Công Dành Cho Công Dân</span>
              </button>

              <button
                id="tab-officer"
                onClick={() => setActivePortal('OFFICER')}
                className={`w-full sm:w-auto flex items-center justify-center space-x-1.5 px-4 py-2 sm:py-1.5 rounded-lg text-xs font-extrabold transition-all duration-200 cursor-pointer shadow-xs ${
                  activePortal === 'OFFICER'
                    ? 'bg-[#0072CE] text-white shadow-md shadow-blue-600/20 border border-blue-700 ring-2 ring-blue-500/30'
                    : 'bg-white text-slate-700 hover:text-blue-900 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Cổng Nghiệp Vụ Cán Bộ & Tiếp Nhận Hồ Sơ</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* PORTAL CONTAINER */}
      <main className="flex-1 w-full max-w-7xl mx-auto flex flex-col p-2 sm:p-4 overflow-y-auto" id="portal-main-container">
        {activePortal === 'CITIZEN' ? (
          <CitizenPortal
            services={services}
            citizens={citizens}
            signatures={signatures}
            onAddDossier={handleAddDossier}
            notifications={notifications}
            dossiers={dossiers}
            onUpdateDossiers={setDossiers}
            auditLogs={auditLogs}
            onAddAuditLog={handleAddAuditLog}
          />
        ) : (
          <OfficerPortal
            services={services}
            citizens={citizens}
            signatures={signatures}
            dossiers={dossiers}
            notifications={notifications}
            auditLogs={auditLogs}
            onAddAuditLog={handleAddAuditLog}
            onUpdateAuditLogs={setAuditLogs}
            onUpdateCitizens={setCitizens}
            onUpdateSignatures={setSignatures}
            onUpdateServices={setServices}
            onUpdateDossiers={setDossiers}
            onAddNotification={handleAddNotification}
          />
        )}
      </main>

      {/* FOOTER SECTION */}
      <footer className="bg-slate-900 border-t border-slate-800 py-1.5 px-4 text-center text-slate-400 text-[10px] sm:text-xs font-medium shrink-0 flex items-center justify-center" id="app-footer">
        <p className="leading-tight text-slate-400 text-[10px] sm:text-[11px]" id="footer-text">
          Hạ tầng kỹ thuật số liên thông | Hệ thống Trợ lý số <span className="font-bold text-amber-300">K-GOV ASSIST</span> | Tích hợp VNeID & CSDL Dân cư Quốc gia.
        </p>
      </footer>
    </div>
  );
}
