<Autocomplete
options={timeSlots}
getOptionDisabled={(option) =>
option === timeSlots[0] || option === timeSlots[2]
}
sx={{ width: 300 }}
renderInput={(params) => <TextField {...params} label="Disabled options" />}
/><Autocomplete
options={timeSlots}
getOptionDisabled={(option) =>
option === timeSlots[0] || option === timeSlots[2]
}
sx={{ width: 300 }}
renderInput={(params) => <TextField {...params} label="Disabled options" />}
/>