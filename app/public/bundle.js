
(function(l, i, v, e) { v = l.createElement(i); v.async = 1; v.src = '//' + (location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; e = l.getElementsByTagName(i)[0]; e.parentNode.insertBefore(v, e)})(document, 'script');
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.data !== data)
            text.data = data;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment) {
            $$.update($$.dirty);
            run_all($$.before_update);
            $$.fragment.p($$.dirty, $$.ctx);
            $$.dirty = null;
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        if (component.$$.fragment) {
            run_all(component.$$.on_destroy);
            component.$$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            component.$$.on_destroy = component.$$.fragment = null;
            component.$$.ctx = {};
        }
    }
    function make_dirty(component, key) {
        if (!component.$$.dirty) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty = blank_object();
        }
        component.$$.dirty[key] = true;
    }
    function init(component, options, instance, create_fragment, not_equal, prop_names) {
        const parent_component = current_component;
        set_current_component(component);
        const props = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props: prop_names,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty: null
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, props, (key, value) => {
                if ($$.ctx && not_equal($$.ctx[key], $$.ctx[key] = value)) {
                    if ($$.bound[key])
                        $$.bound[key](value);
                    if (ready)
                        make_dirty(component, key);
                }
            })
            : props;
        $$.update();
        ready = true;
        run_all($$.before_update);
        $$.fragment = create_fragment($$.ctx);
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    /* src/Nested.svelte generated by Svelte v3.7.1 */

    const file = "src/Nested.svelte";

    function create_fragment(ctx) {
    	var p, t0, t1;

    	return {
    		c: function create() {
    			p = element("p");
    			t0 = text("The answer is ");
    			t1 = text(ctx.answer);
    			add_location(p, file, 4, 0, 55);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, p, anchor);
    			append(p, t0);
    			append(p, t1);
    		},

    		p: function update(changed, ctx) {
    			if (changed.answer) {
    				set_data(t1, ctx.answer);
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(p);
    			}
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let { answer = 'default' } = $$props;

    	const writable_props = ['answer'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Nested> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('answer' in $$props) $$invalidate('answer', answer = $$props.answer);
    	};

    	return { answer };
    }

    class Nested extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, ["answer"]);
    	}

    	get answer() {
    		throw new Error("<Nested>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set answer(value) {
    		throw new Error("<Nested>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/INfo.svelte generated by Svelte v3.7.1 */

    const file$1 = "src/INfo.svelte";

    function create_fragment$1(ctx) {
    	var p, t0, code, t1, t2, t3, t4, t5, t6, a0, t7, a0_href_value, t8, a1, t9;

    	return {
    		c: function create() {
    			p = element("p");
    			t0 = text("The ");
    			code = element("code");
    			t1 = text(ctx.name);
    			t2 = text(" package is ");
    			t3 = text(ctx.speed);
    			t4 = text(" fast.\n\n    Download version ");
    			t5 = text(ctx.version);
    			t6 = text("\n    from ");
    			a0 = element("a");
    			t7 = text("npm");
    			t8 = text("\n    and ");
    			a1 = element("a");
    			t9 = text("learn more here");
    			add_location(code, file$1, 5, 8, 78);
    			attr(a0, "href", a0_href_value = "https://www.npmjs.com/package/" + ctx.name);
    			add_location(a0, file$1, 8, 9, 164);
    			attr(a1, "href", ctx.website);
    			add_location(a1, file$1, 9, 8, 227);
    			add_location(p, file$1, 4, 0, 66);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, p, anchor);
    			append(p, t0);
    			append(p, code);
    			append(code, t1);
    			append(p, t2);
    			append(p, t3);
    			append(p, t4);
    			append(p, t5);
    			append(p, t6);
    			append(p, a0);
    			append(a0, t7);
    			append(p, t8);
    			append(p, a1);
    			append(a1, t9);
    		},

    		p: function update(changed, ctx) {
    			if (changed.name) {
    				set_data(t1, ctx.name);
    			}

    			if (changed.speed) {
    				set_data(t3, ctx.speed);
    			}

    			if (changed.version) {
    				set_data(t5, ctx.version);
    			}

    			if ((changed.name) && a0_href_value !== (a0_href_value = "https://www.npmjs.com/package/" + ctx.name)) {
    				attr(a0, "href", a0_href_value);
    			}

    			if (changed.website) {
    				attr(a1, "href", ctx.website);
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(p);
    			}
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { name, version, speed, website } = $$props;

    	const writable_props = ['name', 'version', 'speed', 'website'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<INfo> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('name' in $$props) $$invalidate('name', name = $$props.name);
    		if ('version' in $$props) $$invalidate('version', version = $$props.version);
    		if ('speed' in $$props) $$invalidate('speed', speed = $$props.speed);
    		if ('website' in $$props) $$invalidate('website', website = $$props.website);
    	};

    	return { name, version, speed, website };
    }

    class INfo extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, ["name", "version", "speed", "website"]);

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.name === undefined && !('name' in props)) {
    			console.warn("<INfo> was created without expected prop 'name'");
    		}
    		if (ctx.version === undefined && !('version' in props)) {
    			console.warn("<INfo> was created without expected prop 'version'");
    		}
    		if (ctx.speed === undefined && !('speed' in props)) {
    			console.warn("<INfo> was created without expected prop 'speed'");
    		}
    		if (ctx.website === undefined && !('website' in props)) {
    			console.warn("<INfo> was created without expected prop 'website'");
    		}
    	}

    	get name() {
    		throw new Error("<INfo>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<INfo>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get version() {
    		throw new Error("<INfo>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set version(value) {
    		throw new Error("<INfo>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get speed() {
    		throw new Error("<INfo>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set speed(value) {
    		throw new Error("<INfo>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get website() {
    		throw new Error("<INfo>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set website(value) {
    		throw new Error("<INfo>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.7.1 */

    const file$2 = "src/App.svelte";

    function create_fragment$2(ctx) {
    	var h1, t0, t1, t2, t3, t4, t5, h2, t7, current;

    	var nested0 = new Nested({
    		props: { answer: 420 },
    		$$inline: true
    	});

    	var nested1 = new Nested({ $$inline: true });

    	var info = new INfo({
    		props: {
    		name: ctx.pkg.name,
    		version: ctx.pkg.version,
    		speed: ctx.pkg.speed,
    		website: ctx.pkg.website
    	},
    		$$inline: true
    	});

    	return {
    		c: function create() {
    			h1 = element("h1");
    			t0 = text("Hello ");
    			t1 = text(ctx.name);
    			t2 = text("!");
    			t3 = space();
    			nested0.$$.fragment.c();
    			t4 = space();
    			nested1.$$.fragment.c();
    			t5 = space();
    			h2 = element("h2");
    			h2.textContent = "The info";
    			t7 = space();
    			info.$$.fragment.c();
    			attr(h1, "class", "svelte-i7qo5m");
    			add_location(h1, file$2, 22, 0, 297);
    			add_location(h2, file$2, 28, 0, 358);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert(target, h1, anchor);
    			append(h1, t0);
    			append(h1, t1);
    			append(h1, t2);
    			insert(target, t3, anchor);
    			mount_component(nested0, target, anchor);
    			insert(target, t4, anchor);
    			mount_component(nested1, target, anchor);
    			insert(target, t5, anchor);
    			insert(target, h2, anchor);
    			insert(target, t7, anchor);
    			mount_component(info, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (!current || changed.name) {
    				set_data(t1, ctx.name);
    			}

    			var info_changes = {};
    			if (changed.pkg) info_changes.name = ctx.pkg.name;
    			if (changed.pkg) info_changes.version = ctx.pkg.version;
    			if (changed.pkg) info_changes.speed = ctx.pkg.speed;
    			if (changed.pkg) info_changes.website = ctx.pkg.website;
    			info.$set(info_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(nested0.$$.fragment, local);

    			transition_in(nested1.$$.fragment, local);

    			transition_in(info.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(nested0.$$.fragment, local);
    			transition_out(nested1.$$.fragment, local);
    			transition_out(info.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach(h1);
    				detach(t3);
    			}

    			destroy_component(nested0, detaching);

    			if (detaching) {
    				detach(t4);
    			}

    			destroy_component(nested1, detaching);

    			if (detaching) {
    				detach(t5);
    				detach(h2);
    				detach(t7);
    			}

    			destroy_component(info, detaching);
    		}
    	};
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { name } = $$props;


        const pkg = {
            name: "svelte",
            version: 3,
            speed: "blasing",
            website: "http://example.com"
        };

    	const writable_props = ['name'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('name' in $$props) $$invalidate('name', name = $$props.name);
    	};

    	return { name, pkg };
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, ["name"]);

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.name === undefined && !('name' in props)) {
    			console.warn("<App> was created without expected prop 'name'");
    		}
    	}

    	get name() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
