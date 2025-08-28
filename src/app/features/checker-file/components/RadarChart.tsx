"use client";

import React, { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

interface RadarChartProps {
  scores: {
    contentQuality: number;
    structure: number;
    language: number;
    ideology: number;
    market: number;
  };
}

export default function RadarChart({ scores }: RadarChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (chartRef.current) {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      const ctx = chartRef.current.getContext('2d');
      if (ctx) {
        chartInstance.current = new Chart(ctx, {
          type: 'radar',
          data: {
            labels: [
              '内容质量',
              '结构组织',
              '语言表达',
              '意识形态',
              '市场定位'
            ],
            datasets: [
              {
                label: '评分',
                data: [
                  scores.contentQuality,
                  scores.structure,
                  scores.language,
                  scores.ideology,
                  scores.market
                ],
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 2,
                pointBackgroundColor: 'rgba(54, 162, 235, 1)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgba(54, 162, 235, 1)',
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
              r: {
                angleLines: {
                  display: true
                },
                suggestedMin: 0,
                suggestedMax: 10,
                ticks: {
                  stepSize: 2
                }
              }
            },
            plugins: {
              legend: {
                position: 'top',
              },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    return `${context.dataset.label}: ${context.parsed.r.toFixed(1)}`;
                  }
                }
              }
            }
          }
        });
      }
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [scores]);

  return (
    <canvas ref={chartRef} />
  );
}