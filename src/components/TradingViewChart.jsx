import React, { useEffect, useRef } from 'react'
import { createChart, CandlestickSeries, AreaSeries } from 'lightweight-charts'

export default function TradingViewChart({ data, selectedToken, chartType = 'candle' }) {
  const chartContainerRef = useRef(null)
  const chartRef = useRef(null)
  const seriesRef = useRef(null)

  useEffect(() => {
    if (!chartContainerRef.current) return

    const container = chartContainerRef.current

    // Setup chart options
    const chart = createChart(container, {
      layout: {
        background: { color: '#080A0F' },
        textColor: '#8B91A8',
        fontSize: 11,
        fontFamily: 'Space Grotesk, sans-serif',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.02)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.02)' },
      },
      crosshair: {
        mode: 1, // Magnet mode
        vertLine: {
          color: 'rgba(245, 166, 35, 0.25)',
          width: 1,
          style: 3,
        },
        horzLine: {
          color: 'rgba(245, 166, 35, 0.25)',
          width: 1,
          style: 3,
        },
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.04)',
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.04)',
        timeVisible: true,
        secondsVisible: false,
      },
      width: container.clientWidth,
      height: container.clientHeight || 350,
    })

    chartRef.current = chart

    let series
    if (chartType === 'candle') {
      series = chart.addSeries(CandlestickSeries, {
        upColor: '#00D084',
        downColor: '#FF4757',
        borderVisible: false,
        wickUpColor: '#00D084',
        wickDownColor: '#FF4757',
      })
    } else {
      series = chart.addSeries(AreaSeries, {
        topColor: 'rgba(245, 166, 35, 0.15)',
        bottomColor: 'rgba(245, 166, 35, 0.00)',
        lineColor: '#F5A623',
        lineWidth: 2,
      })
    }
    seriesRef.current = series

    const handleResize = () => {
      if (chartRef.current && container) {
        chartRef.current.applyOptions({ 
          width: container.clientWidth,
          height: container.clientHeight || 350
        })
      }
    }

    window.addEventListener('resize', handleResize)
    
    // Initial size adjustment
    setTimeout(handleResize, 100)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
    }
  }, [chartType])

  useEffect(() => {
    if (seriesRef.current && data && data.length > 0) {
      const formatted = data.map((d) => {
        const timeInSeconds = Math.floor(new Date(d.time).getTime() / 1000)
        if (chartType === 'candle') {
          return {
            time: timeInSeconds,
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
          }
        } else {
          return {
            time: timeInSeconds,
            value: d.close,
          }
        }
      }).sort((a, b) => a.time - b.time)

      // Deduplicate timestamps
      const uniqueData = []
      const seenTimes = new Set()
      for (const item of formatted) {
        if (!seenTimes.has(item.time)) {
          seenTimes.add(item.time)
          uniqueData.push(item)
        }
      }

      if (uniqueData.length > 0) {
        seriesRef.current.setData(uniqueData)
        
        // Fit content
        setTimeout(() => {
          if (chartRef.current) {
            chartRef.current.timeScale().fitContent()
          }
        }, 50)
      }
    }
  }, [data, chartType])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={chartContainerRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }} />
    </div>
  )
}
