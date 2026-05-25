import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, ResponsiveContainer, Tooltip,
} from 'recharts'
import type { SkillScores } from '@/types'

interface SkillRadarProps {
  scores: Partial<SkillScores>
  size?: number
}

const SKILL_LABELS: Record<keyof SkillScores, string> = {
  technique: 'Kỹ thuật',
  footwork:  'Di chuyển',
  tactics:   'Chiến thuật',
  fitness:   'Thể lực',
}

export function SkillRadar({ scores, size = 240 }: SkillRadarProps) {
  const data = (Object.keys(SKILL_LABELS) as (keyof SkillScores)[]).map(key => ({
    subject: SKILL_LABELS[key],
    value: scores[key] ?? 0,
    fullMark: 100,
  }))

  return (
    <ResponsiveContainer width="100%" height={size}>
      <RadarChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
        <PolarGrid stroke="#e5e7eb" />
        <PolarAngleAxis
          dataKey="subject"
          tick={{ fontSize: 12, fill: '#6b7280' }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={{ fontSize: 10, fill: '#9ca3af' }}
          tickCount={5}
        />
        <Radar
          name="Kỹ năng"
          dataKey="value"
          stroke="#b91c1c"
          fill="#b91c1c"
          fillOpacity={0.25}
          strokeWidth={2}
        />
        <Tooltip
          formatter={(value: number) => [`${value}/100`, 'Điểm']}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}
