
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, LineElement, PointElement } from 'chart.js';
import * as dbService from '../services/db';
import { useTheme } from '../hooks/useTheme';
// Fix: Removed startOfToday and subDays from date-fns import list as they are reported as missing exports in this environment.
import { endOfToday } from 'date-fns';
import { DollarSign, Hash, BarChart3, Star, Info, TrendingUp, TrendingDown, Minus, AlertTriangle, Sparkles, ArrowRight } from 'lucide-react';
import DateRangePicker from './DateRangePicker';
import LowStockReportModal from './LowStockReportModal';
import type { Product, DominionInsight } from '../types';

Chart.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, LineElement, PointElement);

// Manual implementations of missing date-fns functions to fix export errors.
const subDays = (date: Date, amount: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() - amount);
    return d;
};
const startOfToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
};

interface StatCardProps {
    title: string;
    value: number;
    compareValue?: number;
    icon: React.ReactNode;
    formatAsCurrency?: boolean;
    onClick?: () => void;
    variant?: 'default' | 'alert';
}
const StatCard: React.FC<StatCardProps> = ({ title, value, compareValue, icon, formatAsCurrency=false, onClick, variant = 'default' }) => {
    let change = null;
    if (compareValue !== undefined && compareValue !== null && compareValue > 0) {
        change = ((value - compareValue) / compareValue) * 100;
    } else if (value > 0 && compareValue === 0) {
        change = 100;
    }

    const formattedValue = formatAsCurrency ? `$${value.toLocaleString()}` : value.toString();
    const changeColor = change === null || change === 0 ? 'text-gray-500' : change > 0 ? 'text-green-500' : 'text-red-500';
    const ChangeIcon = change === null || change === 0 ? Minus : change > 0 ? TrendingUp : TrendingDown;

    const variantClasses = {
        default: {
            bg: 'bg-white dark:bg-dp-charcoal',
            iconBg: 'bg-dp-blue/10 dark:bg-dp-gold/10',
            iconText: 'text-dp-blue dark:text-dp-gold',
        },
        alert: {
            bg: 'bg-red-50 dark:bg-red-900/10',
            iconBg: 'bg-red-500/10',
            iconText: 'text-red-600 dark:text-red-400',
        }
    }
    const classes = variantClasses[variant];
    const cursorClass = onClick ? 'cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all' : '';

    return (
        <div className={`${classes.bg} ${cursorClass} p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-5`} onClick={onClick}>
            <div className={`p-4 rounded-xl ${classes.iconBg} ${classes.iconText}`}>
                {icon}
            </div>
            <div>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{title}</p>
                <div className="flex items-baseline gap-3">
                    <p className="text-3xl font-black text-dp-dark-gray dark:text-dp-light-gray">{formattedValue}</p>
                    {change !== null && (
                        <span className={`flex items-center text-xs font-black ${changeColor} bg-gray-100 dark:bg-black/30 px-2 py-0.5 rounded-full`}>
                            <ChangeIcon size={12} className="mr-1" />
                            {change.toFixed(0)}%
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

interface DashboardProps {
    onGeneratePO: (products: Product[]) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onGeneratePO }) => {
    const { theme } = useTheme();
    const [dateRanges, setDateRanges] = useState<{
        primary: { start: Date, end: Date },
        comparison: { start: Date, end: Date } | null
    }>({
        primary: {
            start: subDays(startOfToday(), 6),
            end: endOfToday()
        },
        comparison: null
    });
    const [dashboardData, setDashboardData] = useState<any | null>(null);
    const [insights, setInsights] = useState<DominionInsight[]>([]);
    const [lowStockCount, setLowStockCount] = useState(0);
    const [isLowStockModalOpen, setIsLowStockModalOpen] = useState(false);

    const refreshDashboardData = useCallback(() => {
        const data = dbService.getDashboardData(dateRanges.primary, dateRanges.comparison);
        setDashboardData(data);
        setInsights(dbService.generateInsights());
        const products: Product[] = dbService.getProducts();
        const lowStockProducts = products.filter(p => 
            p.lowStockThreshold !== undefined && p.stock <= p.lowStockThreshold
        );
        setLowStockCount(lowStockProducts.length);
    }, [dateRanges]);

    useEffect(() => {
        refreshDashboardData();
    }, [refreshDashboardData]);
    
    const chartTextColor = theme === 'dark' ? '#d1d5db' : '#111827';
    const chartGridColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
    const isComparing = !!dateRanges.comparison;

    const { periodData, comparePeriodData } = dashboardData || {};

    const salesChartData = useMemo(() => {
        if (!periodData) return null;
        const datasets = [
            {
                label: 'Periodo Actual',
                data: periodData.salesByDayValues,
                backgroundColor: theme === 'dark' ? '#D4AF37' : '#0056B3',
                borderRadius: 8,
                barThickness: 20,
            }
        ];
        if (isComparing && comparePeriodData) {
            datasets.push({
                label: 'Periodo Anterior',
                data: comparePeriodData.salesByDayValues,
                backgroundColor: 'rgba(156, 163, 175, 0.3)',
                borderRadius: 8,
                barThickness: 20,
            } as any);
        }
        return { labels: periodData.labels, datasets };
    }, [periodData, comparePeriodData, isComparing, theme]);

    const commonChartOptions = (titleText: string) => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: isComparing, position: 'bottom' as const, labels: { color: chartTextColor, font: { weight: 'bold', size: 10 } } },
            title: { display: true, text: titleText.toUpperCase(), color: chartTextColor, font: { size: 12, weight: '900' }, padding: 20 }
        },
        scales: {
            y: { ticks: { color: chartTextColor, font: { size: 10 } }, grid: { color: chartGridColor } },
            x: { ticks: { color: chartTextColor, font: { size: 10 } }, grid: { display: false } }
        }
    });

    if (!periodData) return <div className="flex items-center justify-center h-full">Cargando Inteligencia...</div>;

    return (
        <div className="flex-grow overflow-y-auto pb-6 space-y-6">
            <div className="mb-2">
                <DateRangePicker value={dateRanges} onChange={setDateRanges} />
            </div>

            {isLowStockModalOpen && <LowStockReportModal onClose={() => setIsLowStockModalOpen(false)} onGeneratePO={onGeneratePO} />}

            {/* DOMINION ADVISOR - IA INSIGHTS */}
            {insights.length > 0 && (
                <section className="animate-fade-in-out">
                    <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                        <Sparkles size={14} className="text-dp-blue dark:text-dp-gold animate-pulse" /> Dominion Advisor
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {insights.map(insight => (
                            <div key={insight.id} className={`p-4 rounded-2xl border-l-4 shadow-sm bg-white dark:bg-dp-charcoal flex gap-4 items-start transition-all hover:shadow-md ${
                                insight.severity === 'high' ? 'border-red-500' : insight.severity === 'medium' ? 'border-orange-400' : 'border-blue-400'
                            }`}>
                                <div className={`p-2 rounded-xl ${
                                    insight.type === 'stock' ? 'bg-red-50 text-red-600 dark:bg-red-900/20' : 
                                    insight.type === 'favorite' ? 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20' : 
                                    'bg-blue-50 text-blue-600 dark:bg-blue-900/20'
                                }`}>
                                    {insight.type === 'stock' ? <AlertTriangle size={20}/> : insight.type === 'favorite' ? <Star size={20}/> : <Info size={20}/>}
                                </div>
                                <div className="flex-1">
                                    <p className="text-xs font-black dark:text-white uppercase tracking-tight">{insight.title}</p>
                                    <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed mt-1">{insight.message}</p>
                                    {insight.actionLabel && (
                                        <button className="mt-2 text-[10px] font-black text-dp-blue dark:text-dp-gold uppercase flex items-center gap-1 hover:underline">
                                            {insight.actionLabel} <ArrowRight size={10}/>
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Ventas Totales" value={periodData.periodStats.totalSales} compareValue={comparePeriodData?.periodStats.totalSales} icon={<DollarSign />} formatAsCurrency />
                <StatCard title="Transacciones" value={periodData.periodStats.transactionCount} compareValue={comparePeriodData?.periodStats.transactionCount} icon={<Hash />} />
                <StatCard title="Ticket Promedio" value={periodData.periodStats.avgTicket} compareValue={comparePeriodData?.periodStats.avgTicket} icon={<BarChart3 />} formatAsCurrency />
                <StatCard title="Stock Bajo" value={lowStockCount} icon={<AlertTriangle />} onClick={() => setIsLowStockModalOpen(true)} variant={lowStockCount > 0 ? 'alert' : 'default'} />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-dp-charcoal p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 h-80">
                    {salesChartData && <Bar options={commonChartOptions('Tendencia de Ingresos') as any} data={salesChartData} />}
                </div>
                <div className="bg-white dark:bg-dp-charcoal p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 h-80">
                     <Doughnut 
                        options={{
                            ...commonChartOptions('Distribución por Categoría'),
                            plugins: { ...commonChartOptions('').plugins, legend: { position: 'right', labels: { color: chartTextColor, font: { size: 9, weight: 'bold' } } } }
                        } as any} 
                        data={{
                            labels: periodData.categorySales.map(([name]: [string]) => name),
                            datasets: [{
                                data: periodData.categorySales.map(([, total]: [string, number]) => total),
                                backgroundColor: ['#0056B3', '#D4AF37', '#10b981', '#f59e0b', '#6366f1', '#ec4899'],
                                borderWidth: 0,
                                hoverOffset: 10
                            }]
                        }} 
                    />
                </div>
            </div>
            
            <div className="bg-white dark:bg-dp-charcoal p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                    <Star size={16} className="text-yellow-500" /> Top 5 Productos del Periodo
                </h3>
                <div className="space-y-4">
                {periodData.topProducts.map((p: any, idx: number) => (
                    <div key={p.name} className="flex justify-between items-center group">
                        <div className="flex items-center gap-4">
                            <span className="text-lg font-black text-gray-300 dark:text-gray-700 w-4">#{idx+1}</span>
                            <span className="font-bold text-sm text-gray-700 dark:text-gray-300 group-hover:text-dp-blue dark:group-hover:text-dp-gold transition-colors">{p.name}</span>
                        </div>
                        <div className="flex items-center gap-4">
                             <div className="h-1.5 w-24 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden hidden sm:block">
                                <div className="h-full bg-dp-blue dark:bg-dp-gold rounded-full" style={{ width: `${(p.quantity / periodData.topProducts[0].quantity) * 100}%` }}></div>
                             </div>
                             <span className="px-3 py-1 rounded-lg bg-dp-soft-gray dark:bg-black/40 text-[10px] font-black uppercase tracking-widest text-gray-500">{p.quantity} Unid.</span>
                        </div>
                    </div>
                ))}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
