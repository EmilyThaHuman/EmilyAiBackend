<Autocomplete
sx={{ width: 300 }}
disableListWrap
options={OPTIONS}
groupBy={(option) => option[0].toUpperCase()}
renderInput={(params) => <TextField {...params} label="10,000 options" />}
renderOption={(props, option, state) =>
[props, option, state.index] as React.ReactNode
}
renderGroup={(params) => params as any}
slots={{
popper: StyledPopper,
listbox: ListboxComponent,
}}
/><Autocomplete
sx={{ width: 300 }}
disableListWrap
options={OPTIONS}
groupBy={(option) => option[0].toUpperCase()}
renderInput={(params) => <TextField {...params} label="10,000 options" />}
renderOption={(props, option, state) =>
[props, option, state.index] as React.ReactNode
}
renderGroup={(params) => params as any}
slots={{
popper: StyledPopper,
listbox: ListboxComponent,
}}
/>