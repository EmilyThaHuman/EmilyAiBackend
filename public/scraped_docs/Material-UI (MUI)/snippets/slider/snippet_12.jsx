<Typography id="non-linear-slider" gutterBottom>
Storage: {valueLabelFormat(calculateValue(value))}
</Typography>
<Slider
value={value}
min={5}
step={1}
max={30}
scale={calculateValue}
getAriaValueText={valueLabelFormat}
valueLabelFormat={valueLabelFormat}
onChange={handleChange}
valueLabelDisplay="auto"
aria-labelledby="non-linear-slider"
/><Typography id="non-linear-slider" gutterBottom>
Storage: {valueLabelFormat(calculateValue(value))}
</Typography>
<Slider
value={value}
min={5}
step={1}
max={30}
scale={calculateValue}
getAriaValueText={valueLabelFormat}
valueLabelFormat={valueLabelFormat}
onChange={handleChange}
valueLabelDisplay="auto"
aria-labelledby="non-linear-slider"
/>