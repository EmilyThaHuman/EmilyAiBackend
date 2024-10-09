const filterOptions = createFilterOptions({
matchFrom: 'start',
stringify: (option) => option.title,
});
<Autocomplete filterOptions={filterOptions} />;