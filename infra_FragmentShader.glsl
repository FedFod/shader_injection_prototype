
	struct FragData {
		vec2 uv;
		vec3 view_normal;
		vec4 diffuse;
	} fragdata;
	
	void frag(inout FragData f) {
		f.diffuse = vec4(0.,1.,0.,1.);
		// f.diffuse.rgb += f.view_normal;
	}
	