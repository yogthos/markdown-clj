(defproject markdown-clj "0.9.5"
  :description "Markdown parser"
  :url "https://github.com/yogthos/markdown-clj"
   :dependencies [[org.clojure/clojure "1.4.0"]]
   :plugins [[lein-cljsbuild "0.2.4"]]
   
   :cljsbuild
   {:crossovers [transformers],
    :builds
    [{:source-path "src-cljs",      
      :compiler {:output-to "js/markdown.js"
                 :optimizations :advanced
                 :pretty-print false}}]})
