"use client";

import { Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend);

type UtilizationChartProps = {
  labels: string[];
  values: number[];
};

export function UtilizationBarChart({ labels, values }: UtilizationChartProps) {
  return (
    <Bar
      data={{
        labels,
        datasets: [
          {
            label: "稼働率",
            data: values.map((value) => Math.round(value * 100)),
            backgroundColor: "rgba(37, 99, 235, 0.6)"
          }
        ]
      }}
      options={{
        responsive: true,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            ticks: {
              callback: (value) => `${value}%`
            },
            max: 150,
            beginAtZero: true
          }
        }
      }}
    />
  );
}

type MonthlyTrendProps = {
  labels: string[];
  planned: number[];
  actual: number[];
};

export function MonthlyTrendChart({ labels, planned, actual }: MonthlyTrendProps) {
  return (
    <Line
      data={{
        labels,
        datasets: [
          {
            label: "計画工数",
            data: planned,
            borderColor: "rgba(37, 99, 235, 1)",
            backgroundColor: "rgba(37, 99, 235, 0.2)",
            tension: 0.3
          },
          {
            label: "調整後工数",
            data: actual,
            borderColor: "rgba(56, 189, 248, 1)",
            backgroundColor: "rgba(56, 189, 248, 0.2)",
            tension: 0.3
          }
        ]
      }}
      options={{
        responsive: true,
        plugins: {
          legend: {
            position: "bottom"
          }
        }
      }}
    />
  );
}
