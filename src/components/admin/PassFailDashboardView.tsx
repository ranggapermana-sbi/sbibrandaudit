import React from 'react';
import { ArrowLeft, CheckCircle2, Clock, ClipboardCheck, XCircle } from 'lucide-react';
import type { AuditResult } from '../../lib/auditResults';
import { BreakdownCounts, BreakdownDimension, BreakdownGroup, BreakdownProfile, buildDepartmentBreakdown, buildPassFailBreakdown, DepartmentRef, overallCounts } from '../../lib/passFailBreakdown';

// Pass/Fail dashboard: audit results split into pie charts by Region, Country, Brand and Dedicated Marcomm/PR.
export interface PassFailDashboardViewProps {
    auditResults: AuditResult[];
    profiles: BreakdownProfile[];
    departments: DepartmentRef[];
    onBackToDashboard: () => void;
}

const PASS_COLOR = '#10b981';
const FAIL_COLOR = '#f43f5e';
const EMPTY_COLOR = '#e2e8f0';

const SECTIONS: { key: BreakdownDimension; title: string; description: string }[] = [
    { key: 'region', title: 'By Region', description: 'Pass and fail for the hotels in each region.' },
    { key: 'country', title: 'By Country', description: 'Pass and fail for the hotels in each country.' },
    { key: 'brand', title: 'By Brand', description: 'Pass and fail for the hotels in each brand.' },
    { key: 'marcomm', title: 'Dedicated Marcomm/PR', description: 'Hotels with a Marcomm/PR staff member compared with hotels without one.' },
];

const percent = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0);

const pointOn = (cx: number, cy: number, r: number, angle: number) => ({
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
});

// Pie of passed and failed hotels. Not-audited hotels are not drawn; they are counted in the card text.
const PassFailPie: React.FC<{ passed: number; failed: number; label: string }> = ({ passed, failed, label }) => {
    const size = 120;
    const c = size / 2;
    const r = c - 2;
    const total = passed + failed;
    const description = total === 0
        ? `${label}: no audited hotels`
        : `${label}: ${passed} passed, ${failed} failed`;

    let body: React.ReactNode;
    if (total === 0) {
        body = <circle cx={c} cy={c} r={r} fill={EMPTY_COLOR} />;
    } else if (passed === 0 || failed === 0) {
        body = <circle cx={c} cy={c} r={r} fill={passed > 0 ? PASS_COLOR : FAIL_COLOR} />;
    } else {
        const start = -Math.PI / 2;
        const passSweep = (passed / total) * Math.PI * 2;
        const splitAngle = start + passSweep;
        const a = pointOn(c, c, r, start);
        const b = pointOn(c, c, r, splitAngle);
        const end = pointOn(c, c, r, start + Math.PI * 2 - 0.000001);
        const passPath = `M ${c} ${c} L ${a.x} ${a.y} A ${r} ${r} 0 ${passSweep > Math.PI ? 1 : 0} 1 ${b.x} ${b.y} Z`;
        const failPath = `M ${c} ${c} L ${b.x} ${b.y} A ${r} ${r} 0 ${Math.PI * 2 - passSweep > Math.PI ? 1 : 0} 1 ${end.x} ${end.y} Z`;
        body = (
            <>
                <path d={passPath} fill={PASS_COLOR} />
                <path d={failPath} fill={FAIL_COLOR} />
            </>
        );
    }

    return (
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label={description} className="shrink-0">
            <title>{description}</title>
            {body}
        </svg>
    );
};

const LegendRow: React.FC<{ swatch: string; label: string; value: number; detail?: string }> = ({ swatch, label, value, detail }) => (
    <div className="flex items-center justify-between gap-3 text-xs">
        <span className="inline-flex items-center gap-2 text-slate-600 font-bold">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: swatch }} aria-hidden="true" />
            {label}
        </span>
        <span className="font-black text-slate-800 tabular-nums">
            {value}
            {detail && <span className="font-bold text-slate-400 ml-1.5">{detail}</span>}
        </span>
    </div>
);

const GroupCard: React.FC<{ group: BreakdownGroup }> = ({ group }) => {
    const audited = group.passed + group.failed;
    return (
        <div className="bg-white p-5 rounded-[20px] border border-slate-150/80 shadow-sm flex flex-col gap-4">
            <div className="min-w-0">
                <p className="text-sm font-bold text-slate-800 tracking-tight break-words">{group.label}</p>
                <p className="text-xs text-slate-400 mt-0.5 tabular-nums">{audited} audited hotel{audited === 1 ? '' : 's'}</p>
            </div>
            <div className="flex items-center gap-5">
                <PassFailPie passed={group.passed} failed={group.failed} label={group.label} />
                <div className="flex-1 min-w-0 space-y-2">
                    <LegendRow swatch={PASS_COLOR} label="Passed" value={group.passed} detail={audited > 0 ? `${percent(group.passed, audited)}%` : undefined} />
                    <LegendRow swatch={FAIL_COLOR} label="Failed" value={group.failed} detail={audited > 0 ? `${percent(group.failed, audited)}%` : undefined} />
                    {group.notAudited > 0 && (
                        <LegendRow swatch={EMPTY_COLOR} label="Not audited" value={group.notAudited} />
                    )}
                </div>
            </div>
        </div>
    );
};

const SummaryTile: React.FC<{ label: string; value: number; icon: React.ReactNode; tone: string }> = ({ label, value, icon, tone }) => (
    <div className="bg-white p-5 rounded-[20px] border border-slate-150/80 shadow-sm flex items-center gap-4">
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${tone}`}>{icon}</div>
        <div>
            <p className="text-xs font-bold text-slate-400">{label}</p>
            <p className="text-2xl font-extrabold text-slate-900 tabular-nums">{value}</p>
        </div>
    </div>
);

export const PassFailDashboardView: React.FC<PassFailDashboardViewProps> = ({ auditResults, profiles, departments, onBackToDashboard }) => {
    const breakdown = React.useMemo(() => buildPassFailBreakdown(auditResults, profiles), [auditResults, profiles]);
    const departmentGroups = React.useMemo(() => buildDepartmentBreakdown(auditResults, departments), [auditResults, departments]);
    const totals: BreakdownCounts = React.useMemo(() => overallCounts(auditResults), [auditResults]);

    return (
        <div className="space-y-6 animate-fadeIn">
            <div>
                <button
                    type="button"
                    onClick={onBackToDashboard}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50/50 hover:bg-indigo-100/60 px-3.5 py-1.5 rounded-full border border-indigo-100/50 mb-3 hover:shadow-sm active:scale-95 transition-all outline-none"
                >
                    <ArrowLeft size={12} /> Back to Audit Report & Inspection
                </button>
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Pass / Fail Dashboard</h2>
                <p className="text-xs text-slate-500 mt-1">
                    Audit results as pie charts. Hotels that have not been audited are left out of the pies and counted beside them.
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <SummaryTile label="Hotels" value={auditResults.length} icon={<ClipboardCheck size={20} />} tone="bg-indigo-50 text-indigo-700" />
                <SummaryTile label="Passed" value={totals.passed} icon={<CheckCircle2 size={20} />} tone="bg-emerald-50 text-emerald-700" />
                <SummaryTile label="Failed" value={totals.failed} icon={<XCircle size={20} />} tone="bg-rose-50 text-rose-700" />
                <SummaryTile label="Not audited" value={totals.notAudited} icon={<Clock size={20} />} tone="bg-slate-100 text-slate-600" />
            </div>

            {SECTIONS.map(section => {
                const groups = breakdown[section.key];
                return (
                    <section key={section.key} className="bg-white p-6 sm:p-8 rounded-[28px] border border-slate-150/80 shadow-[0_12px_40px_rgba(15,23,42,0.02)]">
                        <h3 className="text-lg font-bold text-slate-900 tracking-tight">{section.title}</h3>
                        <p className="text-xs text-slate-500 mt-1 mb-6">{section.description}</p>
                        {groups.length === 0 ? (
                            <p className="text-sm text-slate-400">No hotels to show.</p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                                {groups.map(group => (
                                    <GroupCard key={group.key} group={group} />
                                ))}
                            </div>
                        )}
                    </section>
                );
            })}

            <section className="bg-white p-6 sm:p-8 rounded-[28px] border border-slate-150/80 shadow-[0_12px_40px_rgba(15,23,42,0.02)]">
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">By Audit Department</h3>
                <p className="text-xs text-slate-500 mt-1 mb-6">A hotel passes a department when its score there reaches the hotel's pass mark.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {departmentGroups.map(group => (
                        <GroupCard key={group.key} group={group} />
                    ))}
                </div>
            </section>
        </div>
    );
};
