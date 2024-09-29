import { matchSorter } from 'match-sorter';
const filterOptions = (options, { inputValue }) => matchSorter(options, inputValue);
<Autocomplete filterOptions={filterOptions} />;