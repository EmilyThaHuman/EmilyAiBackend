<Stack spacing={2} direction="row" sx={{ alignItems: 'center', mb: 1 }}>
<VolumeDown />
<Slider aria-label="Volume" value={value} onChange={handleChange} />
<VolumeUp />
</Stack>
<Slider disabled defaultValue={30} aria-label="Disabled slider" /><Stack spacing={2} direction="row" sx={{ alignItems: 'center', mb: 1 }}>
<VolumeDown />
<Slider aria-label="Volume" value={value} onChange={handleChange} />
<VolumeUp />
</Stack>
<Slider disabled defaultValue={30} aria-label="Disabled slider" />