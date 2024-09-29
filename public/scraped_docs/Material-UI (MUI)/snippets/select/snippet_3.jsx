function MyListSubheader(props: ListSubheaderProps) {
return <ListSubheader {...props} />;
}
MyListSubheader.muiSkipListHighlight = true;
export default MyListSubheader;
return (
<Select>
<MyListSubheader>Group 1</MyListSubheader>
<MenuItem value={1}>Option 1</MenuItem>
<MenuItem value={2}>Option 2</MenuItem>
<MyListSubheader>Group 2</MyListSubheader>
<MenuItem value={3}>Option 3</MenuItem>
<MenuItem value={4}>Option 4</MenuItem>
{}
</Select>