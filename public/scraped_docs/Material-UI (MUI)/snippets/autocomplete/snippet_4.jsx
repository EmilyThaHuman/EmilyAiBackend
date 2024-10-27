return <Autocomplete multiple value={allValues.filter((v) => v.selected)} />;
const selectedValues = React.useMemo(() => allValues.filter((v) => v.selected), [allValues]);
return <Autocomplete multiple value={selectedValues} />;
