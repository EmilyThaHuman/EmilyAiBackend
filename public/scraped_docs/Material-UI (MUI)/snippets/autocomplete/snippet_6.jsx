<Autocomplete
options={options.sort((a, b) => -b.firstLetter.localeCompare(a.firstLetter))}
groupBy={(option) => option.firstLetter}
getOptionLabel={(option) => option.title}
sx={{ width: 300 }}
renderInput={(params) => <TextField {...params} label="With categories" />}
renderGroup={(params) => (
<li key={params.key}>
<GroupHeader>{params.group}</GroupHeader>
<GroupItems>{params.children}</GroupItems>
</li>
)}
/><Autocomplete
options={options.sort((a, b) => -b.firstLetter.localeCompare(a.firstLetter))}
groupBy={(option) => option.firstLetter}
getOptionLabel={(option) => option.title}
sx={{ width: 300 }}
renderInput={(params) => <TextField {...params} label="With categories" />}
renderGroup={(params) => (
<li key={params.key}>
<GroupHeader>{params.group}</GroupHeader>
<GroupItems>{params.children}</GroupItems>
</li>
)}
/>