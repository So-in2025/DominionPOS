
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, LineElement, PointElement } from 'chart.js';
import * as dbService from '../services/db';
import { useTheme } from '../hooks/useTheme';
import { startOfToday, endOfToday, subDays } from 'date-fns';
import { DollarSign, Hash, BarChart3, Star, Info, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';
import DateRangePicker from './DateRangePicker';
import LowStockReportModal from './LowStockReportModal';
import type { Product } from '../types';

Chart.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, LineElement, PointElement);

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
    if (compareValue !== undefined && compareValue !== null) {
        if (compareValue > 0) {
            change = ((value - compareValue) / compareValue) * 100;
        } else if (value > 0) {
            change = 100; // From 0 to a positive number is a 100% "increase" for simplicity
        } else {
            change = 0; // 0 to 0
        }
    }

    const formattedValue = formatAsCurrency ? `$${value.toFixed(2)}` : value.toString();
    const changeColor = change === null || change === 0 ? 'text-gray-500' : change > 0 ? 'text-green-500' : 'text-red-500';
    const ChangeIcon = change === null || change === 0 ? Minus : change > 0 ? TrendingUp : TrendingDown;

    const variantClasses = {
        default: {
            bg: 'bg-dp-light dark:bg-dp-charcoal',
            iconBg: 'bg-dp-blue/10 dark:bg-dp-gold/10',
            iconText: 'text-dp-blue dark:text-dp-gold',
        },
        alert: {
            bg: 'bg-yellow-50 dark:bg-yellow-900/20',
            iconBg: 'bg-yellow-500/10',
            iconText: 'text-yellow-600 dark:text-yellow-400',
        }
    }
    const classes = variantClasses[variant];
    const cursorClass = onClick ? 'cursor-pointer hover:shadow-lg transition-shadow' : '';

    return (
        <div className={`${classes.bg} ${cursorClass} p-4 rounded-lg shadow-md flex items-center gap-4`} onClick={onClick}>
            <div className={`p-3 rounded-full ${classes.iconBg} ${classes.iconText}`}>
                {icon}
            </div>
            <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
                <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold text-dp-dark-gray dark:text-dp-light-gray">{formattedValue}</p>
                    {change !== null && (
                        <span className={`flex items-center text-sm font-semibold ${changeColor}`}>
                            <ChangeIcon size={16} className="mr-1" />
                            {change.toFixed(1)}%
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
    const [lowStockCount, setLowStockCount] = useState(0);
    const [isLowStockModalOpen, setIsLowStockModalOpen] = useState(false);

    const refreshDashboardData = useCallback(() => {
        const data = dbService.getDashboardData(dateRanges.primary, dateRanges.comparison);
        setDashboardData(data);
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
    const chartGridColor = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const isComparing = !!dateRanges.comparison;

    const commonChartOptions = (titleText: string) => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: isComparing, labels: { color: chartTextColor } },
            title: { display: true, text: titleText, color: chartTextColor, font: { size: 16 } }
        },
        scales: {
            y: { ticks: { color: chartTextColor }, grid: { color: chartGridColor } },
            x: { ticks: { color: chartTextColor }, grid: { color: 'transparent' } }
        }
    });

    const { periodData, comparePeriodData } = dashboardData || {};

    const salesChartData = {
        labels: periodData?.salesByDay.map(([date]: [string]) => new Date(date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })),
        datasets: [
            {
                type: 'bar' as const,
                label: 'Periodo Actual',
                data: periodData?.salesByDayValues,
                backgroundColor: theme === 'dark' ? '#D4AF37' : '#0056B3',
                borderRadius: 4,
            },
        ]
    };
    if (isComparing && comparePeriodData) {
        salesChartData.datasets.push({
            type: 'line' as const,
            label: 'Periodo Anterior',
            data: comparePeriodData.salesByDayValues,
            borderColor: '#9ca3af',
            backgroundColor: 'transparent',
            pointBackgroundColor: '#9ca3af',
            borderDash: [5, 5],
            tension: 0.2,
        } as any);
    }
    
    const hourlyChartData = {
        labels: Array.from({ length: 24 }, (_, i) => `${i}`),
        datasets: [{
            type: 'bar' as const,
            label: 'Periodo Actual',
            data: periodData?.salesByHour,
            backgroundColor: theme === 'dark' ? 'rgba(212, 175, 55, 0.7)' : 'rgba(0, 86, 179, 0.7)',
            borderRadius: 4,
        }]
    };
     if (isComparing && comparePeriodData) {
        hourlyChartData.datasets.push({
            type: 'line' as const,
            label: 'Periodo Anterior',
            data: comparePeriodData.salesByHour,
            borderColor: '#9ca3af',
            backgroundColor: 'transparent',
            pointBackgroundColor: '#9ca3af',
            borderDash: [5, 5],
            tension: 0.2,
        } as any);
    }

    const categoryChartData = {
        labels: periodData?.categorySales.map(([name]: [string]) => name),
        datasets: [{
            data: periodData?.categorySales.map(([, total]: [string, number]) => total),
            backgroundColor: ['#0056B3', '#D4AF37', '#1f2937', '#9ca3af', '#6b7280', '#4b5563'],
            borderColor: theme === 'dark' ? '#000000' : '#FFFFFF',
            borderWidth: 2,
        }]
    };
    
    const paymentChartData = {
        labels: periodData?.paymentMethodSplit.map(([name]: [string]) => name),
        datasets: [{
            data: periodData?.paymentMethodSplit.map(([, total]: [string, number]) => total),
            backgroundColor: ['#10b981', '#3b82f6'],
            borderColor: theme === 'dark' ? '#000000' : '#FFFFFF',
            borderWidth: 2,
        }]
    };

    const doughnutChartOptions = (titleText: string) => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'right' as const, labels: { color: chartTextColor } },
            title: { display: true, text: titleText, color: chartTextColor, font: { size: 16 } }
        }
    });
    
    if (!periodData) {
        return <div className="flex items-center justify-center h-full">Cargando datos del dashboard...</div>;
    }

    return (
        <div className="flex-grow overflow-y-auto pb-6">
            <div className="mb-6">
                <DateRangePicker value={dateRanges} onChange={setDateRanges} />
            </div>

            {isLowStockModalOpen && <LowStockReportModal onClose={() => setIsLowStockModalOpen(false)} onGeneratePO={onGeneratePO} />}

            {!periodData.hasTransactions ? (
                <div className="flex flex-col items-center justify-center text-center h-96 bg-dp-light dark:bg-dp-charcoal rounded-lg shadow-md">
                    <Info size={48} className="text-gray-400 mb-4" />
                    <h3 className="text-xl font-semibold text-dp-dark-gray dark:text-dp-light-gray">No hay datos de ventas</h3>
                    <p className="text-gray-500 dark:text-gray-400">No se encontraron transacciones en el periodo seleccionado.</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <StatCard title="Ventas Totales" value={periodData.periodStats.totalSales} compareValue={comparePeriodData?.periodStats.totalSales} icon={<DollarSign />} formatAsCurrency />
                        <StatCard title="Transacciones" value={periodData.periodStats.transactionCount} compareValue={comparePeriodData?.periodStats.transactionCount} icon={<Hash />} />
                        <StatCard title="Ticket Promedio" value={periodData.periodStats.avgTicket} compareValue={comparePeriodData?.periodStats.avgTicket} icon={<BarChart3 />} formatAsCurrency />
                        <StatCard title="Items con Stock Bajo" value={lowStockCount} icon={<AlertTriangle />} onClick={() => setIsLowStockModalOpen(true)} variant={lowStockCount > 0 ? 'alert' : 'default'} />
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        <div className="bg-dp-light dark:bg-dp-charcoal p-4 rounded-lg shadow-md h-80"><Bar options={commonChartOptions('Tendencia de Ventas') as any} data={salesChartData} /></div>
                        <div className="bg-dp-light dark:bg-dp-charcoal p-4 rounded-lg shadow-md h-80"><Bar options={commonChartOptions('Rendimiento por Hora') as any} data={hourlyChartData} /></div>
                        <div className="bg-dp-light dark:bg-dp-charcoal p-4 rounded-lg shadow-md h-80"><Doughnut options={doughnutChartOptions('Ventas por Categoría') as any} data={categoryChartData} /></div>
                        <div className="bg-dp-light dark:bg-dp-charcoal p-4 rounded-lg shadow-md h-80"><Doughnut options={doughnutChartOptions('Métodos de Pago') as any} data={paymentChartData} /></div>
                    </div>
                    
                    <div className="bg-dp-light dark:bg-dp-charcoal p-4 rounded-lg shadow-md">
                         <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Star size={20} className="text-yellow-500" />
                            Top 5 Productos {isComparing ? '(Periodo Actual)' : ''}
                         </h3>
                         <ul className="space-y-3">
                            {periodData.topProducts.map((p: any) => (
                                <li key={p.name} className="flex justify-between items-center text-sm">
                                    <span className="font-semibold">{p.name}</span>
                                    <span className="px-2 py-0.5 rounded-full bg-dp-soft-gray dark:bg-black text-xs font-bold">{p.quantity} <span className="font-normal">vendidos</span></span>
                                </li>
                            ))}
                         </ul>
                    </div>
                </>
            )}
        </div>
    );
};

export default Dashboard;
