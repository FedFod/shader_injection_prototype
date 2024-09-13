
	struct VertData {
		vec3 vertex_position;
		vec3 vertex_normal;
	} vertdata;
	
	void vert(inout VertData v) {
		v.vertex_position += normalize(v.vertex_normal)*20.;
		// v.vertex_position.x += sin(v.vertex_normal.x*10.)*20.;
	}
	