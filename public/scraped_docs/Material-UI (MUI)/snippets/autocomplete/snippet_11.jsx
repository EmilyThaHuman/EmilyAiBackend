<Autocomplete
multiple
limitTags={2}
id="multiple-limit-tags"
options={top100Films}
getOptionLabel={(option) => option.title}
defaultValue={[top100Films[13], top100Films[12], top100Films[11]]}
renderInput={(params) => (
<TextField {...params} label="limitTags" placeholder="Favorites" />
)}
sx={{ width: '500px' }}
/><Autocomplete
multiple
limitTags={2}
id="multiple-limit-tags"
options={top100Films}
getOptionLabel={(option) => option.title}
defaultValue={[top100Films[13], top100Films[12], top100Films[11]]}
renderInput={(params) => (
<TextField {...params} label="limitTags" placeholder="Favorites" />
)}
sx={{ width: '500px' }}
/>