export default function MyListSubheader(
props: ListSubheaderProps & { muiSkipListHighlight: boolean },
) {
const { muiSkipListHighlight, ...other } = props;
return <ListSubheader {...other} />;
}
return (
<Select>
<MyListSubheader muiSkipListHighlight>Group 1</MyListSubheader>
<MenuItem value={1}>Option 1</MenuItem>
<MenuItem value={2}>Option 2</MenuItem>
<MyListSubheader muiSkipListHighlight>Group 2</MyListSubheader>
<MenuItem value={3}>Option 3</MenuItem>
<MenuItem value={4}>Option 4</MenuItem>
{}
</Select>
);