<script>
	export let name;

    import Nested from './Nested.svelte'
    import Info from './INfo.svelte'


    const pkg = {
        name: "svelte",
        version: 3,
        speed: "blasing",
        website: "http://example.com"
    };

</script>

<style>
	h1 {
		color: purple;
	}
</style>

<h1>Hello {name}!</h1>

<Nested answer={420} />
<Nested />


<h2>The info</h2>

<Info name="{pkg.name}" version={pkg.version} speed={pkg.speed} website={pkg.website} />
