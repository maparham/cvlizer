/**
 * StatCard - Reusable statistics display component
 * 
 * This component displays a single statistic with an icon, value, and optional trend.
 * Used throughout the admin dashboard for consistent data presentation.
 * 
 * Key responsibilities:
 * - Display statistic title and value
 * - Show optional trend information
 * - Provide consistent styling and layout
 * - Support different color themes
 * 
 * Usage context:
 * - Used in admin dashboard overview tab
 * - Can be reused in other admin components
 * - Integrates with Material-UI theming
 */

import React from 'react'
import { Card, CardContent, Box, Typography } from '@mui/material'
import { TrendingUp } from '@mui/icons-material'

interface StatCardProps {
  title: string
  value: number
  icon: React.ReactNode
  color?: string
  trend?: { value: number; label: string }
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  icon, 
  color = 'primary', 
  trend 
}) => (
  <Card>
    <CardContent>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box>
          <Typography color="textSecondary" gutterBottom variant="h6">
            {title}
          </Typography>
          <Typography variant="h4" component="h2">
            {value.toLocaleString()}
          </Typography>
          {trend && (
            <Box display="flex" alignItems="center" mt={1}>
              <TrendingUp fontSize="small" color="success" />
              <Typography variant="body2" color="success.main" sx={{ ml: 0.5 }}>
                {trend.value}% {trend.label}
              </Typography>
            </Box>
          )}
        </Box>
        <Box color={`${color}.main`} fontSize={40}>
          {icon}
        </Box>
      </Box>
    </CardContent>
  </Card>
)

export default StatCard
