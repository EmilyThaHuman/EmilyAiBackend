<Autocomplete
options={options.sort((a, b) => -b.firstLetter.localeCompare(a.firstLetter))}
groupBy={(option) => option.firstLetter}
getOptionLabel={(option) => option.title}
sx={{ width: 300 }}
renderInput={(params) => <TextField {...params} label="With categories" />}
/><Autocomplete
options={options.sort((a, b) => -b.firstLetter.localeCompare(a.firstLetter))}
groupBy={(option) => option.firstLetter}
getOptionLabel={(option) => option.title}
sx={{ width: 300 }}
renderInput={(params) => <TextField {...params} label="With categories" />}
/>