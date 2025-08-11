from manim import *

class TrappingWater(Scene):
    def construct(self):
        # Configuration
        heights = [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]
        n = len(heights)
        bar_width = 0.5
        x_start = -5  # Adjusted start position
        y_base = -2  # Adjusted base position
        bar_color = BLUE
        water_color = TEAL
        text_color = WHITE
        font_size = 24

        # Title
        title = Text("Trapping Rain Water", font_size=36, color=text_color).move_to(UP * 3.5)
        self.play(Write(title))
        self.wait(1)

        # Create bars
        bars = VGroup()
        for i, height in enumerate(heights):
            bar = Rectangle(width=bar_width, height=height, fill_color=bar_color, fill_opacity=0.8, stroke_color=WHITE)
            bar.move_to(x_start + i * bar_width, y_base + height / 2, 0)
            bars.add(bar)
        self.play(Create(bars))
        self.wait(1)

        # Calculate trapped water
        water_units = 0
        water_rects = VGroup()

        for i in range(1, n - 1):
            left_max = max(heights[:i])
            right_max = max(heights[i + 1:])
            water_level = min(left_max, right_max)
            if water_level > heights[i]:
                water_height = water_level - heights[i]
                water_rect = Rectangle(width=bar_width, height=water_height, fill_color=water_color, fill_opacity=0.8, stroke_color=water_color)
                water_rect.move_to(x_start + i * bar_width, y_base + heights[i] + water_height / 2, 0)
                water_rects.add(water_rect)
                water_units += water_height

        self.play(Create(water_rects))
        self.wait(1)

        # Display total water units
        total_water_text = Text(f"Total Water: {int(water_units)} units", font_size=font_size, color=text_color).move_to(DOWN * 3)
        self.play(Write(total_water_text))
        self.wait(2)

        # Highlight the water
        self.play(water_rects.animate.set_fill(color=YELLOW, opacity=1))
        self.wait(1)

        # Fade out everything
        self.play(FadeOut(title, bars, water_rects, total_water_text))
        self.wait(1)