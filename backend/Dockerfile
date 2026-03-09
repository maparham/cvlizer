FROM python:3.11-slim

WORKDIR /app

# System deps: pdflatex for LaTeX/PDF export and CV preview; poppler for pdf2image.
# Templates use enumitem and xcolor; texlive-latex-extra provides enumitem.sty.
RUN apt-get update && apt-get install -y --no-install-recommends \
    texlive-latex-base \
    texlive-fonts-recommended \
    texlive-latex-recommended \
    texlive-latex-extra \
    lmodern \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
