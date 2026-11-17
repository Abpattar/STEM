from typing import Dict, List, Any, Optional
from ..geometry.schemas import GeometryShapeType, GeometryShape, GeometryMeasurement


class DiagramEngine:
    """Generate SVG diagrams for geometry problems."""
    
    def __init__(self, width: int = 400, height: int = 300, padding: int = 30):
        self.width = width
        self.height = height
        self.padding = padding
        self.scale = 1.0
    
    def generate(self, problem_type: str, data: Dict[str, Any]) -> str:
        """Generate SVG for a given problem type and data."""
        if problem_type == "triangle":
            return self._generate_triangle(data)
        elif problem_type == "rectangle":
            return self._generate_rectangle(data)
        elif problem_type == "circle":
            return self._generate_circle(data)
        elif problem_type == "parallelogram":
            return self._generate_parallelogram(data)
        elif problem_type == "trapezium":
            return self._generate_trapezium(data)
        elif problem_type == "coordinate_plane":
            return self._generate_coordinate_plane(data)
        elif problem_type == "bar_chart":
            return self._generate_bar_chart(data)
        elif problem_type == "data_table":
            return self._generate_data_table(data)
        elif problem_type == "cuboid":
            return self._generate_cuboid(data)
        elif problem_type == "cylinder":
            return self._generate_cylinder(data)
        elif problem_type == "cone":
            return self._generate_cone(data)
        else:
            return self._generate_placeholder(problem_type)
    
    def _svg_header(self) -> str:
        return f'<svg width="{self.width}" height="{self.height}" viewBox="0 0 {self.width} {self.height}" xmlns="http://www.w3.org/2000/svg">'
    
    def _svg_footer(self) -> str:
        return '</svg>'
    
    def _generate_placeholder(self, problem_type: str) -> str:
        return f'{self._svg_header()}<text x="50%" y="50%" text-anchor="middle" font-size="16" fill="#666">Diagram: {problem_type}</text>{self._svg_footer()}'
    
    def _generate_triangle(self, data: Dict[str, Any]) -> str:
        vertices = data.get("vertices", [{"label": "A", "x": 50, "y": 250}, {"label": "B", "x": 200, "y": 250}, {"label": "C", "x": 125, "y": 80}])
        measurements = data.get("measurements", [])
        
        svg = [self._svg_header()]
        
        for i in range(3):
            x1, y1 = vertices[i]["x"], vertices[i]["y"]
            x2, y2 = vertices[(i+1)%3]["x"], vertices[(i+1)%3]["y"]
            svg.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="#333" stroke-width="2"/>')
        
        for v in vertices:
            svg.append(f'<circle cx="{v["x"]}" cy="{v["y"]}" r="4" fill="#333"/>')
            svg.append(f'<text x="{v["x"]}" y="{v["y"] - 15}" text-anchor="middle" font-size="14" font-weight="bold">{v["label"]}</text>')
        
        for m in measurements:
            if m["type"] == "length":
                svg.append(f'<text x="50%" y="50%" text-anchor="middle" font-size="12" fill="#666">{m["label"]} = {m["value"]} {m["unit"]}</text>')
        
        svg.append(self._svg_footer())
        return "\n".join(svg)
    
    def _generate_rectangle(self, data: Dict[str, Any]) -> str:
        x = data.get("x", 50)
        y = data.get("y", 100)
        width = data.get("width", 200)
        height = data.get("height", 120)
        measurements = data.get("measurements", [])
        
        svg = [self._svg_header()]
        
        svg.append(f'<rect x="{x}" y="{y}" width="{width}" height="{height}" fill="none" stroke="#333" stroke-width="2"/>')
        
        for m in measurements:
            if m["type"] == "length":
                if "length" in m["label"].lower() or "l" == m["label"].lower():
                    svg.append(f'<text x="{x + width/2}" y="{y + height + 25}" text-anchor="middle" font-size="12">{m["value"]} {m["unit"]}</text>')
                elif "width" in m["label"].lower() or "breadth" in m["label"].lower() or "w" == m["label"].lower():
                    svg.append(f'<text x="{x - 15}" y="{y + height/2}" text-anchor="middle" font-size="12" transform="rotate(-90, {x-15}, {y+height/2})">{m["value"]} {m["unit"]}</text>')
        
        svg.append(self._svg_footer())
        return "\n".join(svg)
    
    def _generate_circle(self, data: Dict[str, Any]) -> str:
        cx = data.get("cx", 200)
        cy = data.get("cy", 150)
        radius = data.get("radius", 80)
        measurements = data.get("measurements", [])
        
        svg = [self._svg_header()]
        
        svg.append(f'<circle cx="{cx}" cy="{cy}" r="{radius}" fill="none" stroke="#333" stroke-width="2"/>')
        
        svg.append(f'<circle cx="{cx}" cy="{cy}" r="3" fill="#333"/>')
        svg.append(f'<text x="{cx}" y="{cy - 10}" text-anchor="middle" font-size="12">O</text>')
        
        svg.append(f'<line x1="{cx}" y1="{cy}" x2="{cx + radius}" y2="{cy}" stroke="#666" stroke-width="1" stroke-dasharray="5,5"/>')
        
        for m in measurements:
            if m["type"] == "radius":
                svg.append(f'<text x="{cx + radius/2}" y="{cy - 10}" text-anchor="middle" font-size="12">{m["value"]} {m["unit"]}</text>')
        
        svg.append(self._svg_footer())
        return "\n".join(svg)
    
    def _generate_parallelogram(self, data: Dict[str, Any]) -> str:
        x = data.get("x", 50)
        y = data.get("y", 150)
        width = data.get("width", 180)
        height = data.get("height", 100)
        skew = data.get("skew", 40)
        
        vertices = [
            {"x": x, "y": y},
            {"x": x + width, "y": y},
            {"x": x + width + skew, "y": y + height},
            {"x": x + skew, "y": y + height}
        ]
        
        svg = [self._svg_header()]
        
        for i in range(4):
            x1, y1 = vertices[i]["x"], vertices[i]["y"]
            x2, y2 = vertices[(i+1)%4]["x"], vertices[(i+1)%4]["y"]
            svg.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="#333" stroke-width="2"/>')
        
        svg.append(self._svg_footer())
        return "\n".join(svg)
    
    def _generate_trapezium(self, data: Dict[str, Any]) -> str:
        x = data.get("x", 50)
        y = data.get("y", 150)
        top_width = data.get("top_width", 80)
        bottom_width = data.get("bottom_width", 200)
        height = data.get("height", 100)
        
        vertices = [
            {"x": x + (bottom_width - top_width) / 2, "y": y},
            {"x": x + (bottom_width + top_width) / 2, "y": y},
            {"x": x + bottom_width, "y": y + height},
            {"x": x, "y": y + height}
        ]
        
        svg = [self._svg_header()]
        
        for i in range(4):
            x1, y1 = vertices[i]["x"], vertices[i]["y"]
            x2, y2 = vertices[(i+1)%4]["x"], vertices[(i+1)%4]["y"]
            svg.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="#333" stroke-width="2"/>')
        
        svg.append(self._svg_footer())
        return "\n".join(svg)
    
    def _generate_coordinate_plane(self, data: Dict[str, Any]) -> str:
        points = data.get("points", [])
        lines = data.get("lines", [])
        
        all_x = [p["x"] for p in points]
        all_y = [p["y"] for p in points]
        min_x, max_x = min(all_x) - 1, max(all_x) + 1
        min_y, max_y = min(all_y) - 1, max(all_y) + 1
        
        margin = 40
        plot_width = self.width - 2 * margin
        plot_height = self.height - 2 * margin
        
        def map_x(x):
            return margin + (x - min_x) / (max_x - min_x) * plot_width if max_x != min_x else self.width / 2
        
        def map_y(y):
            return self.height - margin - (y - min_y) / (max_y - min_y) * plot_height if max_y != min_y else self.height / 2
        
        svg = [self._svg_header()]
        
        x_axis_y = map_y(0)
        y_axis_x = map_x(0)
        svg.append(f'<line x1="{margin}" y1="{x_axis_y}" x2="{self.width - margin}" y2="{x_axis_y}" stroke="#999" stroke-width="1"/>')
        svg.append(f'<line x1="{y_axis_x}" y1="{margin}" x2="{y_axis_x}" y2="{self.height - margin}" stroke="#999" stroke-width="1"/>')
        
        for x in range(int(min_x), int(max_x) + 1):
            if x != 0:
                x_pos = map_x(x)
                svg.append(f'<line x1="{x_pos}" y1="{margin}" x2="{x_pos}" y2="{self.height - margin}" stroke="#eee" stroke-width="0.5"/>')
        for y in range(int(min_y), int(max_y) + 1):
            if y != 0:
                y_pos = map_y(y)
                svg.append(f'<line x1="{margin}" y1="{y_pos}" x2="{self.width - margin}" y2="{y_pos}" stroke="#eee" stroke-width="0.5"/>')
        
        for p in points:
            x_pos = map_x(p["x"])
            y_pos = map_y(p["y"])
            svg.append(f'<circle cx="{x_pos}" cy="{y_pos}" r="4" fill="#0066cc"/>')
            svg.append(f'<text x="{x_pos + 8}" y="{y_pos - 8}" font-size="12" fill="#0066cc">{p["label"]} ({p["x"]}, {p["y"]})</text>')
        
        for line in lines:
            p1 = next(p for p in points if p["label"] == line["point1"])
            p2 = next(p for p in points if p["label"] == line["point2"])
            x1, y1 = map_x(p1["x"]), map_y(p1["y"])
            x2, y2 = map_x(p2["x"]), map_y(p2["y"])
            svg.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="#0066cc" stroke-width="2"/>')
        
        svg.append(self._svg_footer())
        return "\n".join(svg)
    
    def _generate_bar_chart(self, data: Dict[str, Any]) -> str:
        values = data.get("values", [])
        labels = data.get("labels", [])
        max_value = max(values) if values else 1
        
        bar_width = 40
        gap = 20
        start_x = 50
        max_height = self.height - 80
        
        svg = [self._svg_header()]
        
        for i, (value, label) in enumerate(zip(values, labels)):
            x = start_x + i * (bar_width + gap)
            height = (value / max_value) * max_height
            y = self.height - 50 - height
            
            svg.append(f'<rect x="{x}" y="{y}" width="{bar_width}" height="{height}" fill="#0066cc"/>')
            svg.append(f'<text x="{x + bar_width/2}" y="{self.height - 30}" text-anchor="middle" font-size="11">{label}</text>')
            svg.append(f'<text x="{x + bar_width/2}" y="{y - 5}" text-anchor="middle" font-size="11" fill="#333">{value}</text>')
        
        svg.append(self._svg_footer())
        return "\n".join(svg)
    
    def _generate_data_table(self, data: Dict[str, Any]) -> str:
        headers = data.get("headers", [])
        rows = data.get("rows", [])
        
        col_width = 100
        row_height = 30
        start_x = 50
        start_y = 50
        
        svg = [self._svg_header()]
        
        for j, header in enumerate(headers):
            x = start_x + j * col_width
            svg.append(f'<rect x="{x}" y="{start_y}" width="{col_width}" height="{30}" fill="#0066cc" stroke="#333"/>')
            svg.append(f'<text x="{x + col_width/2}" y="{start_y + 15 + 5}" text-anchor="middle" font-size="12" fill="white" font-weight="bold">{header}</text>')
        
        for i, row in enumerate(rows):
            y = start_y + 30 + i * 30
            for j, cell in enumerate(row):
                x = start_x + j * col_width
                fill = "#f5f5f5" if i % 2 == 0 else "white"
                svg.append(f'<rect x="{x}" y="{y}" width="{col_width}" height="{30}" fill="{fill}" stroke="#ddd"/>')
                svg.append(f'<text x="{x + col_width/2}" y="{y + 15 + 5}" text-anchor="middle" font-size="11" fill="#333">{cell}</text>')
        
        svg.append(self._svg_footer())
        return "\n".join(svg)
    
    def _generate_cuboid(self, data: Dict[str, Any]) -> str:
        x = data.get("x", 100)
        y = data.get("y", 100)
        w = data.get("width", 120)
        h = data.get("height", 80)
        d = data.get("depth", 60)
        
        iso_x = lambda x, y, z: x * 0.866 - y * 0.866
        iso_y = lambda x, y, z: x * 0.5 + y * 0.5 - z
        
        corners_3d = [
            (0, 0, 0), (w, 0, 0), (w, d, 0), (0, d, 0),
            (0, 0, h), (w, 0, h), (w, d, h), (0, d, h)
        ]
        
        corners_2d = []
        for cx, cy, cz in corners_3d:
            ix = x + iso_x(cx, cy, cz)
            iy = y + iso_y(cx, cy, cz)
            corners_2d.append((ix, iy))
        
        edges = [
            (0, 1), (1, 2), (2, 3), (3, 0),
            (4, 5), (5, 6), (6, 7), (7, 4),
            (0, 4), (1, 5), (2, 6), (3, 7)
        ]
        
        svg = [self._svg_header()]
        
        for e1, e2 in edges:
            x1, y1 = corners_2d[e1]
            x2, y2 = corners_2d[e2]
            stroke = "#333" if (e1, e2) in [(0, 4), (1, 5), (2, 6), (3, 7)] else "#333"
            svg.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{stroke}" stroke-width="2"/>')
        
        measurements = data.get("measurements", [])
        for m in measurements:
            if m["type"] == "length":
                svg.append(f'<text x="50" y="50" text-anchor="middle" font-size="12">{m["value"]} {m["unit"]}</text>')
        
        svg.append(self._svg_footer())
        return "\n".join(svg)
    
    def _generate_cylinder(self, data: Dict[str, Any]) -> str:
        cx = data.get("cx", 200)
        cy = data.get("cy", 150)
        r = data.get("radius", 50)
        h = data.get("height", 100)
        
        svg = [self._svg_header()]
        
        svg.append(f'<ellipse cx="{cx}" cy="{cy}" rx="{r}" ry="{r/3}" fill="none" stroke="#333" stroke-width="2"/>')
        
        svg.append(f'<line x1="{cx - r}" y1="{cy}" x2="{cx - r}" y2="{cy + h}" stroke="#333" stroke-width="2"/>')
        svg.append(f'<line x1="{cx + r}" y1="{cy}" x2="{cx + r}" y2="{cy + h}" stroke="#333" stroke-width="2"/>')
        
        svg.append(f'<ellipse cx="{cx}" cy="{cy + h}" rx="{r}" ry="{r/3}" fill="none" stroke="#333" stroke-width="2" stroke-dasharray="5,5"/>')
        
        measurements = data.get("measurements", [])
        for m in measurements:
            if m["type"] == "radius":
                svg.append(f'<line x1="{cx}" y1="{cy}" x2="{cx + r}" y2="{cy}" stroke="#666" stroke-width="1" stroke-dasharray="5,5"/>')
                svg.append(f'<text x="{cx + r/2}" y="{cy - 10}" text-anchor="middle" font-size="12">{m["value"]} {m["unit"]}</text>')
            elif m["type"] == "height":
                svg.append(f'<line x1="{cx + r + 10}" y1="{cy}" x2="{cx + r + 10}" y2="{cy + h}" stroke="#666" stroke-width="1" stroke-dasharray="5,5"/>')
                svg.append(f'<text x="{cx + r + 20}" y="{cy + h/2}" text-anchor="start" font-size="12">{m["value"]} {m["unit"]}</text>')
        
        svg.append(self._svg_footer())
        return "\n".join(svg)
    
    def _generate_cone(self, data: Dict[str, Any]) -> str:
        cx = data.get("cx", 200)
        cy = data.get("cy", 150)
        r = data.get("radius", 50)
        h = data.get("height", 100)
        
        svg = [self._svg_header()]
        
        svg.append(f'<ellipse cx="{cx}" cy="{cy + h}" rx="{r}" ry="{r/3}" fill="none" stroke="#333" stroke-width="2"/>')
        
        svg.append(f'<line x1="{cx}" y1="{cy}" x2="{cx - r}" y2="{cy + h}" stroke="#333" stroke-width="2"/>')
        svg.append(f'<line x1="{cx}" y1="{cy}" x2="{cx + r}" y2="{cy + h}" stroke="#333" stroke-width="2"/>')
        
        measurements = data.get("measurements", [])
        for m in measurements:
            if m["type"] == "radius":
                svg.append(f'<line x1="{cx}" y1="{cy + h}" x2="{cx + r}" y2="{cy + h}" stroke="#666" stroke-width="1" stroke-dasharray="5,5"/>')
                svg.append(f'<text x="{cx + r/2}" y="{cy + h - 10}" text-anchor="middle" font-size="12">{m["value"]} {m["unit"]}</text>')
            elif m["type"] == "height":
                svg.append(f'<line x1="{cx}" y1="{cy}" x2="{cx}" y2="{cy + h}" stroke="#666" stroke-width="1" stroke-dasharray="5,5"/>')
                svg.append(f'<text x="{cx + 15}" y="{cy + h/2}" text-anchor="start" font-size="12">{m["value"]} {m["unit"]}</text>')
        
        svg.append(self._svg_footer())
        return "\n".join(svg)


def generate_diagram(problem_type: str, data: Dict[str, Any], width: int = 400, height: int = 300) -> str:
    """Convenience function to generate a diagram."""
    engine = DiagramEngine(width, height)
    return engine.generate(problem_type, data)