import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import type { DateDisplayPrecision, DateDisplayFormat } from '../../../../utils/dateUtils';

interface DateDisplaySettingsProps {
  precision: DateDisplayPrecision;
  format: DateDisplayFormat;
  onChange: (field: 'date_display_precision' | 'date_display_format', value: string) => void;
  sx?: object;
}

export const DateDisplaySettings: React.FC<DateDisplaySettingsProps> = ({ precision, format, onChange, sx }) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, ...sx }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
        Date display
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <ToggleButtonGroup
          value={precision}
          exclusive
          size="small"
          onChange={(_, val) => { if (val) onChange('date_display_precision', val); }}
          aria-label="date precision"
        >
          <ToggleButton value="year" sx={{ textTransform: 'none', fontSize: '0.75rem', py: 0.5, px: 1.5 }}>
            Year
          </ToggleButton>
          <ToggleButton value="year-month" sx={{ textTransform: 'none', fontSize: '0.75rem', py: 0.5, px: 1.5 }}>
            Month &amp; Year
          </ToggleButton>
          <ToggleButton value="full" sx={{ textTransform: 'none', fontSize: '0.75rem', py: 0.5, px: 1.5 }}>
            Full date
          </ToggleButton>
        </ToggleButtonGroup>
        <ToggleButtonGroup
          value={format}
          exclusive
          size="small"
          disabled={precision === 'year'}
          onChange={(_, val) => { if (val) onChange('date_display_format', val); }}
          aria-label="date format"
        >
          <ToggleButton value="text" sx={{ textTransform: 'none', fontSize: '0.75rem', py: 0.5, px: 1.5 }}>
            Text
          </ToggleButton>
          <ToggleButton value="numeric" sx={{ textTransform: 'none', fontSize: '0.75rem', py: 0.5, px: 1.5 }}>
            Numeric
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
    </Box>
  );
};
